import { inArray } from "drizzle-orm";
import { cities, cityAliases, getDb, states, stations } from "@fastcharger/database";
import {
  calculateCityCentroid,
  INDIAN_STATES,
  resolveCanonicalCity,
  resolveCanonicalState,
} from "@fastcharger/shared";

export interface DiscoverCitiesOptions {
  db?: ReturnType<typeof getDb>;
}

export interface DiscoveredCitySummary {
  name: string;
  slug: string;
  stateSlug: string;
  stateName: string;
  stationCount: number;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export interface CityDiscoveryResult {
  totalStationsProcessed: number;
  citiesDiscovered: number;
  aliasesRegistered: number;
  stationsMappedToCities: number;
  citySummaries: DiscoveredCitySummary[];
}

export async function discoverCities(
  options: DiscoverCitiesOptions = {},
): Promise<CityDiscoveryResult> {
  const db = options.db ?? getDb();

  // 1. Ensure canonical Indian states exist in the states table
  const stateMap = new Map<string, string>(); // state slug -> state UUID

  for (const s of INDIAN_STATES) {
    const [persistedState] = await db
      .insert(states)
      .values({
        name: s.name,
        slug: s.slug,
        code: s.code,
        latitude: s.latitude,
        longitude: s.longitude,
      })
      .onConflictDoUpdate({
        target: states.slug,
        set: {
          name: s.name,
          code: s.code,
          latitude: s.latitude,
          longitude: s.longitude,
          updatedAt: new Date(),
        },
      })
      .returning({ id: states.id });

    if (persistedState) {
      stateMap.set(s.slug, persistedState.id);
    }
  }

  // 2. Fetch all stations from database
  const allStations = await db
    .select({
      id: stations.id,
      name: stations.name,
      address: stations.address,
      district: stations.district,
      pincode: stations.pincode,
      latitude: stations.latitude,
      longitude: stations.longitude,
      cityId: stations.cityId,
      stateId: stations.stateId,
    })
    .from(stations);

  const totalStationsProcessed = allStations.length;

  // 3. Group stations by discovered canonical city
  interface CityGroup {
    canonicalName: string;
    canonicalSlug: string;
    stateSlug: string;
    stateName: string;
    coordinates: Array<{ lat: number; lng: number }>;
    stationIds: string[];
    aliases: Set<string>;
  }

  const cityGroups = new Map<string, CityGroup>();

  for (const st of allStations) {
    const resolved = resolveCanonicalCity(st.district, st.address, null, { allowFallback: true });
    if (!resolved) continue;

    let group = cityGroups.get(resolved.canonicalSlug);
    if (!group) {
      group = {
        canonicalName: resolved.canonicalName,
        canonicalSlug: resolved.canonicalSlug,
        stateSlug: resolved.stateSlug,
        stateName: resolved.stateName,
        coordinates: [],
        stationIds: [],
        aliases: new Set<string>(),
      };
      cityGroups.set(resolved.canonicalSlug, group);
    }

    group.stationIds.push(st.id);
    group.coordinates.push({ lat: st.latitude, lng: st.longitude });
    if (resolved.aliasUsed) {
      group.aliases.add(resolved.aliasUsed);
    }
  }

  let aliasesRegistered = 0;
  let stationsMappedToCities = 0;
  const citySummaries: DiscoveredCitySummary[] = [];

  // 4. Persist discovered canonical cities, aliases, and update stations
  for (const group of cityGroups.values()) {
    const centroid =
      calculateCityCentroid(group.coordinates) ?? {
        latitude: group.coordinates[0]?.lat ?? 20.5937,
        longitude: group.coordinates[0]?.lng ?? 78.9629,
      };

    let stateId = stateMap.get(group.stateSlug);
    if (!stateId) {
      const fallbackState = resolveCanonicalState(group.stateName) ?? INDIAN_STATES[0];
      stateId = stateMap.get(fallbackState.slug)!;
    }

    const [persistedCity] = await db
      .insert(cities)
      .values({
        name: group.canonicalName,
        slug: group.canonicalSlug,
        stateId,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        stationCount: group.stationIds.length,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cities.slug,
        set: {
          name: group.canonicalName,
          stateId,
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          stationCount: group.stationIds.length,
          updatedAt: new Date(),
        },
      })
      .returning({ id: cities.id });

    if (persistedCity) {
      // Register canonical aliases
      for (const alias of group.aliases) {
        try {
          await db
            .insert(cityAliases)
            .values({
              alias,
              cityId: persistedCity.id,
            })
            .onConflictDoNothing();
          aliasesRegistered++;
        } catch {
          // Ignore duplicate alias constraint
        }
      }

      // Associate stations with canonical city & state
      if (group.stationIds.length > 0) {
        await db
          .update(stations)
          .set({
            cityId: persistedCity.id,
            stateId,
            updatedAt: new Date(),
          })
          .where(inArray(stations.id, group.stationIds));

        stationsMappedToCities += group.stationIds.length;
      }

      citySummaries.push({
        name: group.canonicalName,
        slug: group.canonicalSlug,
        stateSlug: group.stateSlug,
        stateName: group.stateName,
        stationCount: group.stationIds.length,
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        aliases: Array.from(group.aliases),
      });
    }
  }

  // Sort city summaries by station count descending
  citySummaries.sort((a, b) => b.stationCount - a.stationCount);

  return {
    totalStationsProcessed,
    citiesDiscovered: cityGroups.size,
    aliasesRegistered,
    stationsMappedToCities,
    citySummaries,
  };
}
