import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { describe, expect, it } from "vitest";
import { getDb, schema } from "@fastcharger/database";
import { sql, eq } from "drizzle-orm";
import { FastChargerApiClient } from "@fastcharger/shared";

const { cities, stations, connectors, states } = schema;

const API_BASE_URL = process.env.API_URL || "http://localhost:4000";
const DATABASE_URL = process.env.DATABASE_URL;
if(!DATABASE_URL)throw new Error("DATABASE_URL is required for actual database consistency checks");

describe("Prompt 11.6 - Geographic Station Data Consistency Across Pages", () => {
  const client = new FastChargerApiClient({
    baseUrl: API_BASE_URL,
    validateResponses: true,
  });

  const TARGET_CITIES = [
    { slug: "mumbai", name: "Mumbai" },
    { slug: "bengaluru", name: "Bengaluru" },
    { slug: "hyderabad", name: "Hyderabad" },
    { slug: "chennai", name: "Chennai" },
    { slug: "gurugram", name: "Gurugram" },
  ];

  it("ensures Popular Cities count === City Page count === Statistics count === Database count for all target cities", async () => {
    const db = getDb(DATABASE_URL);
    const citiesResponse = await client.getCities({ pageSize: 50 });

    for (const target of TARGET_CITIES) {
      // 1. Popular Cities count (from list API)
      const listCity = citiesResponse.items.find((c) => c.slug === target.slug);
      expect(listCity).toBeDefined();
      const popularCitiesStationCount = listCity!.stationCount;
      const popularCitiesFastChargerCount = listCity!.fastChargerCount;

      // 2. City Page count (from getCity API)
      const cityDetail = await client.getCity(target.slug, { page: 1, pageSize: 20 });
      expect(cityDetail).not.toBeNull();
      const cityPageStationCount = cityDetail!.city.stationCount;
      const cityPageTotalStations = cityDetail!.pagination.total;
      const cityPageFastChargerCount = cityDetail!.city.fastChargerCount;

      // 3. City Statistics count (from dedicated statistics API)
      const statistics = await client.getCityStatistics(target.slug);
      expect(statistics).not.toBeNull();
      const statsStationCount = statistics!.stationCount;
      const statsFastChargerCount = statistics!.fastChargerCount;

      // 4. PostgreSQL Database count (authoritative truth)
      const dbRows = await db
        .select({
          stationCount: sql<number>`cast(count(distinct ${stations.id}) as integer)`,
          fastChargerCount: sql<number>`cast(count(distinct case when ${connectors.powerKw} >= 50 then ${stations.id} end) as integer)`,
        })
        .from(cities)
        .leftJoin(stations, eq(stations.cityId, cities.id))
        .leftJoin(connectors, eq(connectors.stationId, stations.id))
        .where(eq(cities.slug, target.slug))
        .groupBy(cities.id);

      const dbStationCount = Number(dbRows[0]?.stationCount ?? 0);
      const dbFastChargerCount = Number(dbRows[0]?.fastChargerCount ?? 0);

      // ASSERT STRICT EQUALITY: ALL MUST MATCH DOWN TO THE LAST DIGIT
      expect(cityPageStationCount).toBe(popularCitiesStationCount);
      expect(cityPageTotalStations).toBe(popularCitiesStationCount);
      expect(statsStationCount).toBe(popularCitiesStationCount);
      expect(dbStationCount).toBe(popularCitiesStationCount);

      // Fast chargers count must also be consistent
      expect(cityPageFastChargerCount).toBe(popularCitiesFastChargerCount);
      expect(statsFastChargerCount).toBe(popularCitiesFastChargerCount);
      expect(dbFastChargerCount).toBe(popularCitiesFastChargerCount);
    }
  }, 30000);

  it("returns zero and empty array for cities with no stations instead of mock fallbacks", async () => {
    const db = getDb(DATABASE_URL);
    const zeroCitySlug = "test-zero-station-city";
    const sampleState = await db.select({ id: states.id }).from(states).limit(1);
    await db
      .insert(cities)
      .values({
        name: "Test Zero City",
        slug: zeroCitySlug,
        stateId: sampleState[0].id,
        stationCount: 0,
      })
      .onConflictDoNothing();

    const cityDetail = await client.getCity(zeroCitySlug);
    expect(cityDetail).not.toBeNull();
    expect(cityDetail!.city.stationCount).toBe(0);
    expect(cityDetail!.pagination.total).toBe(0);
    expect(cityDetail!.stations).toEqual([]);

    const stats = await client.getCityStatistics(zeroCitySlug);
    expect(stats).not.toBeNull();
    expect(stats!.stationCount).toBe(0);
    expect(stats!.networkCount).toBe(0);
    expect(stats!.fastChargerCount).toBe(0);
    await db.delete(cities).where(eq(cities.slug,zeroCitySlug));
  });

  it("returns null for non-existent city slug without fallback mock data", async () => {
    const result = await client.getCity("non-existent-city-random-xyz");
    expect(result).toBeNull();

    const stats = await client.getCityStatistics("non-existent-city-random-xyz");
    expect(stats).toBeNull();
  });
});
