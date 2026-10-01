import "server-only";

import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { appConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { cities, connectors, operators, pincodes, states, stations } from "@/lib/db/schema";
import {
  findNearbyCanonicalPincodes,
  getCanonicalPincode,
  resolvePincodeStateFromPrefix,
} from "@/lib/geo/canonical-pincodes";
import { distanceInKilometers } from "@/lib/geo/distance";
import { getMockStations, type MockStation } from "@/lib/mock";

export type PincodeMatchType = "exact_pincode" | "nearby_pincode" | "same_city" | "radius";

export interface ResolvedPincodeLocation {
  pincode: string;
  city: string;
  citySlug: string;
  state: string;
  stateSlug: string;
  stateCode: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
}

export type PincodeLocationInfo = ResolvedPincodeLocation;

export interface NearbyPincodeItem {
  pincode: string;
  city: string;
  district: string;
  distanceKm: number;
}

export interface PincodeStationItem extends MockStation {
  matchType: PincodeMatchType;
  distanceKm: number;
  distanceMeters: number;
  stationPincode: string | null;
  stationCity: string;
  stationState: string;
}

export interface PincodeStationResult {
  pincode: string;
  location: {
    city: string;
    citySlug: string;
    state: string;
    stateSlug: string;
    stateCode: string;
    district: string;
    latitude: number | null;
    longitude: number | null;
    hasCoordinates: boolean;
  };
  stations: PincodeStationItem[];
  total: number;
  exactPincodeCount: number;
  nearbyPincodeCount: number;
  radiusCount: number;
  nearbyPincodes: NearbyPincodeItem[];
  radiusKm: number;
  pagination: {
    page: number;
    limit: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Resolves an Indian PIN code to its geographic anchor (city, state, district, lat, lng).
 * Checks the database first, then the canonical postal code catalog.
 * Never fabricates coordinates if unknown.
 */
export async function resolvePincode(pincode: string): Promise<ResolvedPincodeLocation | null> {
  const cleanPin = pincode.trim();
  if (!/^\d{6}$/.test(cleanPin)) return null;

  // 1. Try querying PostgreSQL database if configured
  if (appConfig.database.configured) {
    try {
      const db = getDb();

      // Query pincodes table
      const pinRows = await db
        .select({
          pincode: pincodes.pincode,
          district: pincodes.district,
          latitude: pincodes.latitude,
          longitude: pincodes.longitude,
          cityName: cities.name,
          citySlug: cities.slug,
          stateName: states.name,
          stateSlug: states.slug,
          stateCode: states.code,
        })
        .from(pincodes)
        .leftJoin(cities, eq(pincodes.cityId, cities.id))
        .leftJoin(states, eq(pincodes.stateId, states.id))
        .where(eq(pincodes.pincode, cleanPin))
        .limit(1);

      if (pinRows.length > 0) {
        const row = pinRows[0];
        const hasCoords =
          typeof row.latitude === "number" &&
          typeof row.longitude === "number" &&
          !isNaN(row.latitude) &&
          !isNaN(row.longitude);

        return {
          pincode: cleanPin,
          city: row.cityName ?? "India",
          citySlug: row.citySlug ?? "india",
          state: row.stateName ?? "India",
          stateSlug: row.stateSlug ?? "india",
          stateCode: row.stateCode ?? "IN",
          district: row.district ?? "",
          latitude: hasCoords ? row.latitude : null,
          longitude: hasCoords ? row.longitude : null,
          hasCoordinates: hasCoords,
        };
      }

      // Check if any station in stations table has this pincode
      const stationSample = await db
        .select({
          pincode: stations.pincode,
          district: stations.district,
          latitude: stations.latitude,
          longitude: stations.longitude,
          cityName: cities.name,
          citySlug: cities.slug,
          stateName: states.name,
          stateSlug: states.slug,
          stateCode: states.code,
        })
        .from(stations)
        .leftJoin(cities, eq(stations.cityId, cities.id))
        .leftJoin(states, eq(stations.stateId, states.id))
        .where(eq(stations.pincode, cleanPin))
        .limit(1);

      if (stationSample.length > 0) {
        const row = stationSample[0];
        const hasCoords =
          typeof row.latitude === "number" &&
          typeof row.longitude === "number" &&
          !isNaN(row.latitude) &&
          !isNaN(row.longitude);

        return {
          pincode: cleanPin,
          city: row.cityName ?? "India",
          citySlug: row.citySlug ?? "india",
          state: row.stateName ?? "India",
          stateSlug: row.stateSlug ?? "india",
          stateCode: row.stateCode ?? "IN",
          district: row.district ?? "",
          latitude: hasCoords ? row.latitude : null,
          longitude: hasCoords ? row.longitude : null,
          hasCoordinates: hasCoords,
        };
      }
    } catch (err) {
      console.warn("Database PIN resolution failed, using canonical catalog:", err);
    }
  }

  // 2. Check curated canonical catalog
  const canonical = getCanonicalPincode(cleanPin);
  if (canonical) {
    return {
      pincode: cleanPin,
      city: canonical.cityName,
      citySlug: canonical.citySlug,
      state: canonical.stateName,
      stateSlug: canonical.stateSlug,
      stateCode: canonical.stateCode,
      district: canonical.district,
      latitude: canonical.latitude,
      longitude: canonical.longitude,
      hasCoordinates: true,
    };
  }

  // 3. Fallback: resolve state from postal prefix, leaving coordinates as null
  const prefixState = resolvePincodeStateFromPrefix(cleanPin);
  if (prefixState) {
    return {
      pincode: cleanPin,
      city: prefixState.stateName,
      citySlug: prefixState.stateSlug,
      state: prefixState.stateName,
      stateSlug: prefixState.stateSlug,
      stateCode: prefixState.stateCode,
      district: "",
      latitude: null,
      longitude: null,
      hasCoordinates: false,
    };
  }

  return null;
}

/**
 * Discovers nearby PIN codes based on actual geographic distance.
 * Never relies on numerical PIN proximity.
 */
export async function discoverNearbyPincodes(
  latitude: number | null,
  longitude: number | null,
  options: {
    excludePincode?: string;
    maxDistanceKm?: number;
    limit?: number;
  } = {},
): Promise<NearbyPincodeItem[]> {
  if (latitude === null || longitude === null || isNaN(latitude) || isNaN(longitude)) {
    return [];
  }

  const maxDistanceKm = options.maxDistanceKm ?? 25;
  const limit = options.limit ?? 10;
  const excludePincode = options.excludePincode;

  // 1. Try PostgreSQL PostGIS distance query if configured
  if (appConfig.database.configured) {
    try {
      const db = getDb();
      const maxDistanceMeters = maxDistanceKm * 1000;

      const distanceExpr = sql<number>`ST_Distance(
        ST_SetSRID(ST_MakePoint(${pincodes.longitude}, ${pincodes.latitude}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      )`;

      const rows = await db
        .select({
          pincode: pincodes.pincode,
          district: pincodes.district,
          latitude: pincodes.latitude,
          longitude: pincodes.longitude,
          cityName: cities.name,
          distanceMeters: distanceExpr,
        })
        .from(pincodes)
        .leftJoin(cities, eq(pincodes.cityId, cities.id))
        .where(
          and(
            excludePincode ? ne(pincodes.pincode, excludePincode) : undefined,
            isNotNull(pincodes.latitude),
            isNotNull(pincodes.longitude),
            sql`ST_DWithin(
              ST_SetSRID(ST_MakePoint(${pincodes.longitude}, ${pincodes.latitude}), 4326)::geography,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${maxDistanceMeters}
            )`,
          ),
        )
        .orderBy(sql`${distanceExpr} ASC`)
        .limit(limit);

      if (rows.length > 0) {
        return rows.map((r) => ({
          pincode: r.pincode,
          city: r.cityName ?? "India",
          district: r.district ?? "",
          distanceKm: Math.round((Number(r.distanceMeters) / 1000) * 10) / 10,
        }));
      }
    } catch {
      // Fall through to canonical calculation
    }
  }

  // 2. Fallback to canonical geographic calculation (Haversine formula on real coordinates)
  return findNearbyCanonicalPincodes(latitude, longitude, {
    excludePincode,
    maxDistanceKm,
    limit,
  });
}

/**
 * Searches and categorizes charging stations for an Indian PIN code.
 *
 * Implements 4-tier prioritized search:
 * 1. Exact PIN match (matchType = "exact_pincode")
 * 2. Nearby PIN match (matchType = "nearby_pincode")
 * 3. Same city match (matchType = "same_city")
 * 4. Geographic radius match (matchType = "radius")
 *
 * Automatically deduplicates and calculates distance from the anchor PIN.
 */
export async function getPincodeStationData(
  pincode: string,
  options: {
    radiusKm?: number;
    page?: number;
    limit?: number;
  } = {},
): Promise<PincodeStationResult> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const radiusKm = Math.min(50, Math.max(1, options.radiusKm ?? 5));

  // 1. Resolve PIN location
  const location = await resolvePincode(pincode);

  if (!location) {
    return {
      pincode: pincode.trim(),
      location: {
        city: "",
        citySlug: "",
        state: "",
        stateSlug: "",
        stateCode: "",
        district: "",
        latitude: null,
        longitude: null,
        hasCoordinates: false,
      },
      stations: [],
      total: 0,
      exactPincodeCount: 0,
      nearbyPincodeCount: 0,
      radiusCount: 0,
      nearbyPincodes: [],
      radiusKm,
      pagination: {
        page,
        limit,
        pageSize: limit,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
    };
  }

  const seenStationIds = new Set<string>();
  const exactStations: PincodeStationItem[] = [];
  const nearbyStations: PincodeStationItem[] = [];
  const sameCityStations: PincodeStationItem[] = [];
  const radiusStations: PincodeStationItem[] = [];

  // 2. Discover nearby PINs based on coordinates
  const nearbyPincodes = location.hasCoordinates
    ? await discoverNearbyPincodes(location.latitude, location.longitude, {
        excludePincode: location.pincode,
        maxDistanceKm: Math.max(radiusKm, 15),
        limit: 10,
      })
    : [];

  const nearbyPinSet = new Set(nearbyPincodes.map((np) => np.pincode));

  // 3. PostgreSQL Database Query
  if (appConfig.database.configured) {
    try {
      const db = getDb();

      // Query exact PIN stations
      const exactRows = await db
        .select({
          id: stations.id,
          ocmId: stations.ocmId,
          slug: stations.slug,
          name: stations.name,
          address: stations.address,
          district: stations.district,
          pincode: stations.pincode,
          latitude: stations.latitude,
          longitude: stations.longitude,
          status: stations.status,
          usageType: stations.usageType,
          dataProvider: stations.dataProvider,
          ocmUrl: stations.ocmUrl,
          updatedAt: stations.updatedAt,
          operatorId: stations.operatorId,
          operatorName: operators.name,
          operatorSlug: operators.slug,
          cityName: cities.name,
          citySlug: cities.slug,
          stateName: states.name,
          stateSlug: states.slug,
          stateCode: states.code,
        })
        .from(stations)
        .leftJoin(operators, eq(stations.operatorId, operators.id))
        .leftJoin(cities, eq(stations.cityId, cities.id))
        .leftJoin(states, eq(stations.stateId, states.id))
        .where(eq(stations.pincode, location.pincode));

      const exactIds = exactRows.map((s) => s.id);
      const exactConnectors =
        exactIds.length > 0
          ? await db.select().from(connectors).where(inArray(connectors.stationId, exactIds))
          : [];

      for (const st of exactRows) {
        seenStationIds.add(st.id);
        const stConn = exactConnectors.filter((c) => c.stationId === st.id);
        const fastestKw = stConn.reduce((max, c) => Math.max(max, Number(c.powerKw || 0)), 0);

        let distKm = 0;
        let distM = 0;
        if (location.hasCoordinates) {
          distKm =
            Math.round(
              distanceInKilometers(
                { latitude: location.latitude!, longitude: location.longitude! },
                { latitude: st.latitude, longitude: st.longitude },
              ) * 10,
            ) / 10;
          distM = Math.round(distKm * 1000);
        }

        exactStations.push({
          id: st.id,
          ocmId: st.ocmId ?? 0,
          slug: st.slug,
          name: st.name,
          operator: {
            id: st.operatorId ?? "unknown",
            name: st.operatorName ?? "Independent",
            slug: st.operatorSlug ?? "independent",
          },
          address: st.address ?? "",
          city: { name: st.cityName ?? location.city, slug: st.citySlug ?? location.citySlug },
          state: {
            name: st.stateName ?? location.state,
            slug: st.stateSlug ?? location.stateSlug,
            code: st.stateCode ?? location.stateCode,
          },
          district: st.district ?? location.district,
          pincode: st.pincode ?? location.pincode,
          latitude: st.latitude,
          longitude: st.longitude,
          status: (st.status === "Operational" || st.status === "Not Operational"
            ? st.status
            : "Operational") as "Operational" | "Not Operational" | "Unknown",
          operationalStatus: st.status.toLowerCase().includes("operational")
            ? "available"
            : "unknown",
          usageType: st.usageType ?? "Public",
          dataProvider: st.dataProvider,
          dataLicense: "CC BY 4.0",
          ocmUrl: st.ocmUrl ?? `https://openchargemap.org/site/poi/details/${st.ocmId}`,
          lastUpdated: st.updatedAt ? "Updated recently" : "Verified",
          fastestPowerKw: fastestKw || 50,
          distanceKm: distKm,
          distanceMeters: distM,
          matchType: "exact_pincode",
          stationPincode: st.pincode,
          stationCity: st.cityName ?? location.city,
          stationState: st.stateName ?? location.state,
          connectors: stConn.map((c) => ({
            id: c.id,
            type: c.connectionType,
            normalizedType: (c.normalizedType as "ccs2" | "type2" | "chademo" | "gbt") || "ccs2",
            powerKw: c.powerKw ? Number(c.powerKw) : 50,
            voltage: c.voltage ?? undefined,
            amps: c.amps ?? undefined,
            status: (c.status as "available" | "busy" | "unavailable" | "unknown") || "available",
            quantity: c.quantity ?? 1,
          })),
        });
      }

      // Query PostGIS geographic radius if coordinates are available
      if (location.hasCoordinates) {
        const radiusMeters = radiusKm * 1000;
        const distanceExpr = sql<number>`ST_Distance(
          stations.location,
          ST_SetSRID(ST_MakePoint(${location.longitude!}, ${location.latitude!}), 4326)::geography
        )`;

        const radiusRows = await db
          .select({
            id: stations.id,
            ocmId: stations.ocmId,
            slug: stations.slug,
            name: stations.name,
            address: stations.address,
            district: stations.district,
            pincode: stations.pincode,
            latitude: stations.latitude,
            longitude: stations.longitude,
            status: stations.status,
            usageType: stations.usageType,
            dataProvider: stations.dataProvider,
            ocmUrl: stations.ocmUrl,
            updatedAt: stations.updatedAt,
            operatorId: stations.operatorId,
            operatorName: operators.name,
            operatorSlug: operators.slug,
            cityName: cities.name,
            citySlug: cities.slug,
            stateName: states.name,
            stateSlug: states.slug,
            stateCode: states.code,
            distanceMeters: distanceExpr,
          })
          .from(stations)
          .leftJoin(operators, eq(stations.operatorId, operators.id))
          .leftJoin(cities, eq(stations.cityId, cities.id))
          .leftJoin(states, eq(stations.stateId, states.id))
          .where(
            sql`ST_DWithin(
              stations.location,
              ST_SetSRID(ST_MakePoint(${location.longitude!}, ${location.latitude!}), 4326)::geography,
              ${radiusMeters}
            )`,
          )
          .orderBy(sql`${distanceExpr} ASC`)
          .limit(100);

        const radiusIds = radiusRows.map((s) => s.id).filter((id) => !seenStationIds.has(id));
        const radiusConnectors =
          radiusIds.length > 0
            ? await db.select().from(connectors).where(inArray(connectors.stationId, radiusIds))
            : [];

        for (const st of radiusRows) {
          if (seenStationIds.has(st.id)) continue;
          seenStationIds.add(st.id);

          const stConn = radiusConnectors.filter((c) => c.stationId === st.id);
          const fastestKw = stConn.reduce((max, c) => Math.max(max, Number(c.powerKw || 0)), 0);

          const distM = Math.round(Number(st.distanceMeters));
          const distKm = Math.round((distM / 1000) * 10) / 10;

          // Categorize
          let matchType: PincodeMatchType = "radius";
          if (st.pincode && nearbyPinSet.has(st.pincode)) {
            matchType = "nearby_pincode";
          } else if (
            st.citySlug === location.citySlug ||
            (st.cityName && st.cityName.toLowerCase() === location.city.toLowerCase())
          ) {
            matchType = "same_city";
          }

          const item: PincodeStationItem = {
            id: st.id,
            ocmId: st.ocmId ?? 0,
            slug: st.slug,
            name: st.name,
            operator: {
              id: st.operatorId ?? "unknown",
              name: st.operatorName ?? "Independent",
              slug: st.operatorSlug ?? "independent",
            },
            address: st.address ?? "",
            city: { name: st.cityName ?? location.city, slug: st.citySlug ?? location.citySlug },
            state: {
              name: st.stateName ?? location.state,
              slug: st.stateSlug ?? location.stateSlug,
              code: st.stateCode ?? location.stateCode,
            },
            district: st.district ?? location.district,
            pincode: st.pincode ?? "",
            latitude: st.latitude,
            longitude: st.longitude,
            status: (st.status === "Operational" || st.status === "Not Operational"
              ? st.status
              : "Operational") as "Operational" | "Not Operational" | "Unknown",
            operationalStatus: st.status.toLowerCase().includes("operational")
              ? "available"
              : "unknown",
            usageType: st.usageType ?? "Public",
            dataProvider: st.dataProvider,
            dataLicense: "CC BY 4.0",
            ocmUrl: st.ocmUrl ?? `https://openchargemap.org/site/poi/details/${st.ocmId}`,
            lastUpdated: st.updatedAt ? "Updated recently" : "Verified",
            fastestPowerKw: fastestKw || 50,
            distanceKm: distKm,
            distanceMeters: distM,
            matchType,
            stationPincode: st.pincode,
            stationCity: st.cityName ?? location.city,
            stationState: st.stateName ?? location.state,
            connectors: stConn.map((c) => ({
              id: c.id,
              type: c.connectionType,
              normalizedType: (c.normalizedType as "ccs2" | "type2" | "chademo" | "gbt") || "ccs2",
              powerKw: c.powerKw ? Number(c.powerKw) : 50,
              voltage: c.voltage ?? undefined,
              amps: c.amps ?? undefined,
              status: (c.status as "available" | "busy" | "unavailable" | "unknown") || "available",
              quantity: c.quantity ?? 1,
            })),
          };

          if (matchType === "nearby_pincode") nearbyStations.push(item);
          else if (matchType === "same_city") sameCityStations.push(item);
          else radiusStations.push(item);
        }
      }

      const allOrdered = [
        ...exactStations,
        ...nearbyStations,
        ...sameCityStations,
        ...radiusStations,
      ];
      const total = allOrdered.length;
      const offset = (page - 1) * limit;
      const paged = allOrdered.slice(offset, offset + limit);

      return {
        pincode: location.pincode,
        location: {
          city: location.city,
          citySlug: location.citySlug,
          state: location.state,
          stateSlug: location.stateSlug,
          stateCode: location.stateCode,
          district: location.district,
          latitude: location.latitude,
          longitude: location.longitude,
          hasCoordinates: location.hasCoordinates,
        },
        stations: paged,
        total,
        exactPincodeCount: exactStations.length,
        nearbyPincodeCount: nearbyStations.length,
        radiusCount: sameCityStations.length + radiusStations.length,
        nearbyPincodes,
        radiusKm,
        pagination: {
          page,
          limit,
          pageSize: limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          hasMore: offset + limit < total,
        },
      };
    } catch (err) {
      console.warn("Database PIN station search failed, using mock adapter:", err);
      seenStationIds.clear();
      exactStations.length = 0;
      nearbyStations.length = 0;
      sameCityStations.length = 0;
      radiusStations.length = 0;
    }
  }

  // 4. Fallback Mock Adapter (uses real geographic distance and actual station coordinates)
  const allMock = getMockStations();

  // Step A: Exact PIN match
  for (const st of allMock) {
    if (st.pincode === location.pincode) {
      seenStationIds.add(st.id);

      let distKm = 0;
      let distM = 0;
      if (location.hasCoordinates) {
        distKm =
          Math.round(
            distanceInKilometers(
              { latitude: location.latitude!, longitude: location.longitude! },
              { latitude: st.latitude, longitude: st.longitude },
            ) * 10,
          ) / 10;
        distM = Math.round(distKm * 1000);
      }

      exactStations.push({
        ...st,
        distanceKm: distKm,
        distanceMeters: distM,
        matchType: "exact_pincode",
        stationPincode: st.pincode,
        stationCity: st.city.name,
        stationState: st.state.name,
      });
    }
  }

  // Step B: Geographic radius search if PIN has coordinates
  if (location.hasCoordinates) {
    const candidateStations: Array<{ station: MockStation; distanceKm: number }> = [];

    for (const st of allMock) {
      if (seenStationIds.has(st.id)) continue;

      const dist = distanceInKilometers(
        { latitude: location.latitude!, longitude: location.longitude! },
        { latitude: st.latitude, longitude: st.longitude },
      );

      if (dist <= radiusKm) {
        candidateStations.push({ station: st, distanceKm: Math.round(dist * 10) / 10 });
      }
    }

    // Sort candidate stations strictly by actual geographic distance
    candidateStations.sort((a, b) => a.distanceKm - b.distanceKm);

    for (const { station: st, distanceKm: distKm } of candidateStations) {
      seenStationIds.add(st.id);
      const distM = Math.round(distKm * 1000);

      let matchType: PincodeMatchType = "radius";
      if (st.pincode && nearbyPinSet.has(st.pincode)) {
        matchType = "nearby_pincode";
      } else if (
        st.city.slug === location.citySlug ||
        st.city.name.toLowerCase() === location.city.toLowerCase()
      ) {
        matchType = "same_city";
      }

      const item: PincodeStationItem = {
        ...st,
        distanceKm: distKm,
        distanceMeters: distM,
        matchType,
        stationPincode: st.pincode,
        stationCity: st.city.name,
        stationState: st.state.name,
      };

      if (matchType === "nearby_pincode") nearbyStations.push(item);
      else if (matchType === "same_city") sameCityStations.push(item);
      else radiusStations.push(item);
    }
  }

  const allOrdered = [
    ...exactStations,
    ...nearbyStations,
    ...sameCityStations,
    ...radiusStations,
  ];
  const total = allOrdered.length;
  const offset = (page - 1) * limit;
  const paged = allOrdered.slice(offset, offset + limit);

  return {
    pincode: location.pincode,
    location: {
      city: location.city,
      citySlug: location.citySlug,
      state: location.state,
      stateSlug: location.stateSlug,
      stateCode: location.stateCode,
      district: location.district,
      latitude: location.latitude,
      longitude: location.longitude,
      hasCoordinates: location.hasCoordinates,
    },
    stations: paged,
    total,
    exactPincodeCount: exactStations.length,
    nearbyPincodeCount: nearbyStations.length,
    radiusCount: sameCityStations.length + radiusStations.length,
    nearbyPincodes,
    radiusKm,
    pagination: {
      page,
      limit,
      pageSize: limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: offset + limit < total,
    },
  };
}

export interface FindStationsNearPincodeParams {
  pincode: string;
  radiusKm?: number;
  page?: number;
  limit?: number;
  progressiveFallback?: boolean;
}

export interface FindStationsNearPincodeResult {
  searchType: "pincode";
  pincode: string;
  origin: {
    latitude: number | null;
    longitude: number | null;
    city: string;
    citySlug: string;
    state: string;
    stateSlug: string;
    stateCode: string;
    district: string;
    hasCoordinates: boolean;
  };
  radiusKm: number;
  radiusMeters: number;
  resultCount: number;
  counts: {
    exact: number;
    nearby: number;
    total: number;
  };
  results: PincodeStationItem[];
  nearbyPincodes: NearbyPincodeItem[];
  pagination: {
    page: number;
    limit: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Discovers charging stations around an Indian 6-digit PIN code.
 *
 * Resolves the PIN code to geographic coordinates (via PostGIS database
 * or canonical catalog) and searches within radius, returning both exact
 * and nearby stations categorized by matchType and sorted by physical distance.
 */
export async function findStationsNearPincode(
  pincode: string,
  options: {
    radiusKm?: number;
    page?: number;
    limit?: number;
    progressiveFallback?: boolean;
  } = {},
): Promise<FindStationsNearPincodeResult> {
  const initialRadius = options.radiusKm ?? 10;
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  let data = await getPincodeStationData(pincode, {
    radiusKm: initialRadius,
    page,
    limit,
  });

  // Progressive fallback: if initial search returned 0 stations and coordinates exist,
  // expand search radius to 25 km
  if (
    options.progressiveFallback !== false &&
    data.total === 0 &&
    data.location.hasCoordinates &&
    initialRadius < 25
  ) {
    data = await getPincodeStationData(pincode, {
      radiusKm: 25,
      page,
      limit,
    });
  }

  return {
    searchType: "pincode",
    pincode: data.pincode,
    origin: {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      city: data.location.city,
      citySlug: data.location.citySlug,
      state: data.location.state,
      stateSlug: data.location.stateSlug,
      stateCode: data.location.stateCode,
      district: data.location.district,
      hasCoordinates: data.location.hasCoordinates,
    },
    radiusKm: data.radiusKm,
    radiusMeters: data.radiusKm * 1000,
    resultCount: data.stations.length,
    counts: {
      exact: data.exactPincodeCount,
      nearby: data.nearbyPincodeCount + data.radiusCount,
      total: data.total,
    },
    results: data.stations,
    nearbyPincodes: data.nearbyPincodes,
    pagination: data.pagination,
  };
}

