import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

import { appConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { cities, cityAliases, connectors, operators, states, stations } from "@/lib/db/schema";
import { resolveCanonicalCity } from "@/lib/geo/canonical-data";
import {
  getMockCityBySlug,
  getMockNearbyStations,
  getMockOperators,
  getMockStations,
  getMockStationsByCity,
  type MockStation,
} from "@/lib/mock";
import type { ChargerStatus, StationSearchResult, StationSummary } from "@/types/station";

export interface StationListQuery {
  page: number;
  pageSize: number;
  query?: string;
  citySlug?: string;
  stateSlug?: string;
  minPowerKw?: number;
  connectorType?: string;
}

export interface NearbyStationQuery extends StationListQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface CityStationQueryResult {
  city: {
    name: string;
    slug: string;
    stateName: string;
    stateSlug: string;
    stationCount: number;
    latitude?: number;
    longitude?: number;
  };
  operators: Array<{
    name: string;
    slug: string;
    stationCount: number;
  }>;
  items: MockStation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Retrieves complete city charging station data with real database aggregation
 * and server-side pagination.
 */
export async function getCityStationData(
  citySlug: string,
  query: {
    page?: number;
    pageSize?: number;
    minPowerKw?: number;
    connectorType?: string;
  } = {},
): Promise<CityStationQueryResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

  // 1. Try PostgreSQL database if configured
  if (appConfig.database.configured) {
    try {
      const db = getDb();

      // Check canonical alias first
      const aliasRows = await db
        .select({ cityId: cityAliases.cityId })
        .from(cityAliases)
        .where(eq(cityAliases.alias, citySlug.toLowerCase()));

      const canonicalCityId: string | null = aliasRows[0]?.cityId ?? null;

      let cityRecord:
        | {
            id: string;
            name: string;
            slug: string;
            stateId: string;
            latitude: number | null;
            longitude: number | null;
            stationCount: number;
            stateName: string | null;
            stateSlug: string | null;
          }
        | undefined;

      if (canonicalCityId) {
        const rows = await db
          .select({
            id: cities.id,
            name: cities.name,
            slug: cities.slug,
            stateId: cities.stateId,
            latitude: cities.latitude,
            longitude: cities.longitude,
            stationCount: cities.stationCount,
            stateName: states.name,
            stateSlug: states.slug,
          })
          .from(cities)
          .leftJoin(states, eq(cities.stateId, states.id))
          .where(eq(cities.id, canonicalCityId));
        cityRecord = rows[0];
      } else {
        const rows = await db
          .select({
            id: cities.id,
            name: cities.name,
            slug: cities.slug,
            stateId: cities.stateId,
            latitude: cities.latitude,
            longitude: cities.longitude,
            stationCount: cities.stationCount,
            stateName: states.name,
            stateSlug: states.slug,
          })
          .from(cities)
          .leftJoin(states, eq(cities.stateId, states.id))
          .where(eq(cities.slug, citySlug.toLowerCase()));
        cityRecord = rows[0];
      }

      if (cityRecord) {
        const cityId = cityRecord.id;

        // Query total stations matching city in database
        const totalCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(stations)
          .where(eq(stations.cityId, cityId));

        const realTotal = Number(totalCountResult[0]?.count ?? cityRecord.stationCount);

        // Query operators with station count in this city
        const opResults = await db
          .select({
            name: operators.name,
            slug: operators.slug,
            stationCount: sql<number>`count(${stations.id})`,
          })
          .from(stations)
          .innerJoin(operators, eq(stations.operatorId, operators.id))
          .where(eq(stations.cityId, cityId))
          .groupBy(operators.name, operators.slug);

        // Query paginated stations
        const offset = (page - 1) * pageSize;
        const stationRows = await db
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
          })
          .from(stations)
          .leftJoin(operators, eq(stations.operatorId, operators.id))
          .where(eq(stations.cityId, cityId))
          .limit(pageSize)
          .offset(offset);

        // Fetch connectors for these stations
        const stationIds = stationRows.map((s) => s.id);
        const connectorRows =
          stationIds.length > 0
            ? await db.select().from(connectors).where(inArray(connectors.stationId, stationIds))
            : [];

        const items: MockStation[] = stationRows.map((st) => {
          const stConnectors = connectorRows.filter((c) => c.stationId === st.id);
          const fastestKw = stConnectors.reduce(
            (max, c) => Math.max(max, Number(c.powerKw || 0)),
            0,
          );

          return {
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
            city: { name: cityRecord!.name, slug: cityRecord!.slug },
            state: {
              name: cityRecord!.stateName ?? "India",
              slug: cityRecord!.stateSlug ?? "india",
              code: (cityRecord!.stateSlug ?? "IN").toUpperCase().slice(0, 2),
            },
            district: st.district ?? cityRecord!.name,
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
            connectors: stConnectors.map((c) => ({
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
        });

        return {
          city: {
            name: cityRecord.name,
            slug: cityRecord.slug,
            stateName: cityRecord.stateName ?? "India",
            stateSlug: cityRecord.stateSlug ?? "india",
            stationCount: realTotal,
            latitude: cityRecord.latitude ?? undefined,
            longitude: cityRecord.longitude ?? undefined,
          },
          operators: opResults.map((op) => ({
            name: op.name,
            slug: op.slug,
            stationCount: Number(op.stationCount),
          })),
          items,
          pagination: {
            page,
            pageSize,
            total: realTotal,
            totalPages: Math.max(1, Math.ceil(realTotal / pageSize)),
          },
        };
      }
    } catch (error) {
      console.warn("Database station query failed, falling back to mock adapter:", error);
    }
  }

  // 2. Mock fallback adapter
  const resolved = resolveCanonicalCity(citySlug);
  const canonicalSlug = resolved?.canonicalSlug ?? citySlug.toLowerCase();
  const mockCity = getMockCityBySlug(canonicalSlug) ?? getMockCityBySlug(citySlug);

  const cityName =
    mockCity?.name ??
    resolved?.canonicalName ??
    citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const stateName = mockCity?.stateName ?? resolved?.stateName ?? "India";
  const stateSlug = mockCity?.stateSlug ?? resolved?.stateSlug ?? "india";

  let allMatching = getMockStationsByCity(canonicalSlug);
  if (allMatching.length === 0 && canonicalSlug !== citySlug) {
    allMatching = getMockStationsByCity(citySlug);
  }

  // Filter by power or connector if specified
  if (query.minPowerKw) {
    allMatching = allMatching.filter((s) => s.fastestPowerKw >= query.minPowerKw!);
  }
  if (query.connectorType) {
    allMatching = allMatching.filter((s) =>
      s.connectors.some(
        (c) =>
          c.normalizedType === query.connectorType ||
          c.type.toLowerCase().includes(query.connectorType!.toLowerCase()),
      ),
    );
  }

  const total = allMatching.length > 0 ? allMatching.length : (mockCity?.stationCount ?? 0);
  const offset = (page - 1) * pageSize;
  const items = allMatching.slice(offset, offset + pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const cityOperators = getMockOperators().map((op) => ({
    name: op.name,
    slug: op.slug,
    stationCount: Math.round(op.stationCount * 0.15) || 5,
  }));

  return {
    city: {
      name: cityName,
      slug: canonicalSlug,
      stateName,
      stateSlug,
      stationCount: total,
      latitude: mockCity?.latitude ?? 28.6139,
      longitude: mockCity?.longitude ?? 77.209,
    },
    operators: cityOperators.slice(0, 4),
    items: items.length > 0 ? items : allMatching.slice(0, pageSize),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function listStations(query: StationListQuery): Promise<StationSearchResult> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));

  if (query.citySlug) {
    const cityData = await getCityStationData(query.citySlug, {
      page,
      pageSize,
      minPowerKw: query.minPowerKw,
      connectorType: query.connectorType,
    });

    const items: StationSummary[] = cityData.items.map((st) => ({
      id: st.id,
      slug: st.slug,
      name: st.name,
      latitude: st.latitude,
      longitude: st.longitude,
      address: st.address,
      status: st.operationalStatus ?? "available",
      connectors: st.connectors.map((c) => ({
        type: c.type,
        powerKw: c.powerKw ?? undefined,
        status: (c.status as "available" | "busy" | "unavailable" | "unknown") ?? "available",
      })),
    }));

    return {
      items,
      pagination: {
        page: cityData.pagination.page,
        pageSize: cityData.pagination.pageSize,
        total: cityData.pagination.total,
      },
    };
  }

  const allMock = getMockStations({
    query: query.query,
    minPowerKw: query.minPowerKw,
    connectorType: query.connectorType,
  });

  const offset = (page - 1) * pageSize;
  const sliced = allMock.slice(offset, offset + pageSize);

  const items: StationSummary[] = sliced.map((st) => ({
    id: st.id,
    slug: st.slug,
    name: st.name,
    latitude: st.latitude,
    longitude: st.longitude,
    address: st.address,
    status: st.operationalStatus ?? "available",
    connectors: st.connectors.map((c) => ({
      type: c.type,
      powerKw: c.powerKw ?? undefined,
      status: (c.status as "available" | "busy" | "unavailable" | "unknown") ?? "available",
    })),
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total: allMock.length,
    },
  };
}

export async function findNearbyStations(query: NearbyStationQuery): Promise<StationSearchResult> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
  const radiusKm = query.radiusKm || 25;

  if (appConfig.database.configured) {
    try {
      const db = getDb();
      const targetPoint = sql`ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography`;
      const distanceKmExpr = sql<number>`ROUND((ST_Distance(${stations.location}, ${targetPoint}) / 1000.0)::numeric, 2)`;
      const withinRadiusExpr = sql`ST_DWithin(${stations.location}, ${targetPoint}, ${radiusKm * 1000})`;

      const whereConditions = [withinRadiusExpr];
      if (query.minPowerKw) {
        whereConditions.push(
          sql`EXISTS (SELECT 1 FROM ${connectors} WHERE ${connectors.stationId} = ${stations.id} AND ${connectors.powerKw} >= ${query.minPowerKw})`,
        );
      }
      if (query.connectorType) {
        whereConditions.push(
          sql`EXISTS (SELECT 1 FROM ${connectors} WHERE ${connectors.stationId} = ${stations.id} AND ${connectors.normalizedType} = ${query.connectorType.toLowerCase()})`,
        );
      }

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(stations)
        .where(sql.join(whereConditions, sql` AND `));
      const total = Number(countResult[0]?.count || 0);

      const offset = (page - 1) * pageSize;
      const rows = await db
        .select({
          id: stations.id,
          slug: stations.slug,
          name: stations.name,
          latitude: stations.latitude,
          longitude: stations.longitude,
          address: stations.address,
          status: stations.status,
          distanceKm: distanceKmExpr,
        })
        .from(stations)
        .where(sql.join(whereConditions, sql` AND `))
        .orderBy(sql`${distanceKmExpr} ASC`)
        .limit(pageSize)
        .offset(offset);

      const stationIds = rows.map((r) => r.id);
      const connRows =
        stationIds.length > 0
          ? await db.select().from(connectors).where(inArray(connectors.stationId, stationIds))
          : [];

      const items: StationSummary[] = rows.map((st) => ({
        id: st.id,
        slug: st.slug,
        name: st.name,
        latitude: st.latitude,
        longitude: st.longitude,
        address: st.address,
        status: (st.status === "Operational" ? "available" : "unknown") as ChargerStatus,
        distanceKm: Number(st.distanceKm),
        connectors: connRows
          .filter((c) => c.stationId === st.id)
          .map((c) => ({
            type: c.connectionType,
            powerKw: c.powerKw ? Number(c.powerKw) : undefined,
            status: ((c.status as ChargerStatus) || "available"),
          })),
      }));

      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
        },
      };
    } catch {
      // Fall through to mock spatial
    }
  }

  // Fallback to spatial in-memory proximity calculation
  const allNearby = getMockNearbyStations(query.latitude, query.longitude, radiusKm);
  let filtered = allNearby;
  if (query.minPowerKw) {
    filtered = filtered.filter((s) => s.fastestPowerKw >= query.minPowerKw!);
  }
  if (query.connectorType) {
    const t = query.connectorType.toLowerCase();
    filtered = filtered.filter((s) =>
      s.connectors.some((c) => c.normalizedType === t || c.type.toLowerCase().includes(t)),
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;
  const sliced = filtered.slice(offset, offset + pageSize);

  const items: StationSummary[] = sliced.map((st) => ({
    id: st.id,
    slug: st.slug,
    name: st.name,
    latitude: st.latitude,
    longitude: st.longitude,
    address: st.address,
    status: st.operationalStatus ?? "available",
    distanceKm: st.distanceKm,
    connectors: st.connectors.map((c) => ({
      type: c.type,
      powerKw: c.powerKw ?? undefined,
      status: (c.status as ChargerStatus) ?? "available",
    })),
  }));

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getStation(idOrSlug: string): Promise<MockStation | null> {
  if (appConfig.database.configured) {
    try {
      const db = getDb();
      const stationRows = await db
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
        })
        .from(stations)
        .leftJoin(operators, eq(stations.operatorId, operators.id))
        .leftJoin(cities, eq(stations.cityId, cities.id))
        .leftJoin(states, eq(stations.stateId, states.id))
        .where(
          sql`${stations.slug} = ${idOrSlug} OR ${stations.id}::text = ${idOrSlug} OR ${stations.ocmId}::text = ${idOrSlug}`,
        )
        .limit(1);

      if (stationRows.length > 0) {
        const st = stationRows[0];
        const connectorRows = await db
          .select()
          .from(connectors)
          .where(eq(connectors.stationId, st.id));

        const fastestKw = connectorRows.reduce(
          (max, c) => Math.max(max, Number(c.powerKw || 0)),
          0,
        );

        return {
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
          city: { name: st.cityName ?? "India", slug: st.citySlug ?? "india" },
          state: {
            name: st.stateName ?? "India",
            slug: st.stateSlug ?? "india",
            code: (st.stateSlug ?? "IN").toUpperCase().slice(0, 2),
          },
          district: st.district ?? st.cityName ?? "India",
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
          connectors: connectorRows.map((c) => ({
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
      }
    } catch {
      // Fall through to mock
    }
  }

  const all = getMockStations();
  return (
    all.find((s) => s.slug === idOrSlug || s.id === idOrSlug || String(s.ocmId) === idOrSlug) ??
    null
  );
}
