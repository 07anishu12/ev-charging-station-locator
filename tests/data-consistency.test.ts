import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { describe, expect, it } from "vitest";
import { getDb, schema } from "@fastcharger/database";
import { sql, eq } from "drizzle-orm";
import { FastChargerApiClient } from "@fastcharger/shared";

const { cities, stations, connectors } = schema;

const API_BASE_URL = process.env.API_URL || "http://localhost:4000";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5433/fastcharger";

describe("Prompt 11.6 - Geographic Station Data Consistency Across Pages", () => {
  const client = new FastChargerApiClient({
    baseUrl: API_BASE_URL,
    validateResponses: true,
  });

  const TARGET_CITIES = [
    { slug: "mumbai", name: "Mumbai", forbiddenMockCount: 390 },
    { slug: "bengaluru", name: "Bengaluru", forbiddenMockCount: 380 },
    { slug: "hyderabad", name: "Hyderabad", forbiddenMockCount: 260 },
    { slug: "chennai", name: "Chennai", forbiddenMockCount: 230 },
    { slug: "gurugram", name: "Gurugram", forbiddenMockCount: 210 },
  ];

  it("ensures zero mock counts (390, 380, 260, 230, 210) exist in cities list API", async () => {
    const citiesResponse = await client.getCities({ pageSize: 50 });
    expect(citiesResponse.items.length).toBeGreaterThan(0);

    for (const target of TARGET_CITIES) {
      const city = citiesResponse.items.find((c) => c.slug === target.slug);
      expect(city).toBeDefined();
      expect(city!.stationCount).not.toBe(target.forbiddenMockCount);
      expect(city!.stationCount).toBeGreaterThanOrEqual(0);
      expect(city!.stationCount).toBeLessThan(100); // real ingested counts are under 100
    }
  });

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
      const cityDetail = await client.getCity(target.slug, { page: 1, pageSize: 100 });
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
  });

  it("returns zero and empty array for cities with no stations instead of mock fallbacks", async () => {
    const zeroCities = ["jaipur", "kochi", "noida"];

    for (const slug of zeroCities) {
      const cityDetail = await client.getCity(slug);
      expect(cityDetail).not.toBeNull();
      expect(cityDetail!.city.stationCount).toBe(0);
      expect(cityDetail!.pagination.total).toBe(0);
      expect(cityDetail!.stations).toEqual([]);

      const stats = await client.getCityStatistics(slug);
      expect(stats).not.toBeNull();
      expect(stats!.stationCount).toBe(0);
      expect(stats!.networkCount).toBe(0);
      expect(stats!.fastChargerCount).toBe(0);
    }
  });

  it("returns null for non-existent city slug without fallback mock data", async () => {
    const result = await client.getCity("non-existent-city-random-xyz");
    expect(result).toBeNull();

    const stats = await client.getCityStatistics("non-existent-city-random-xyz");
    expect(stats).toBeNull();
  });
});
