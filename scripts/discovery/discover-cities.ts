import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not configured.");
    console.error("Please configure DATABASE_URL in .env.local or your environment.");
    process.exit(1);
  }

  const { discoverCities } = await import("@/services/discovery/discover-cities");
  const { closeDb, getDb } = await import("@/lib/db/client");
  const { stations, cities } = await import("@/lib/db/schema");
  const { eq, sql } = await import("drizzle-orm");

  try {
    console.log("FastCharger Indian City & State Discovery Engine\n");
    const result = await discoverCities();

    console.log(`Processed Stations: ${result.totalStationsProcessed}`);
    console.log(`Cities Discovered: ${result.citiesDiscovered}`);
    console.log(`Aliases Registered: ${result.aliasesRegistered}`);
    console.log(`Stations Mapped to Cities: ${result.stationsMappedToCities}\n`);

    console.log("Representative Indian Locations:");
    console.log("--------------------------------------------------");

    const db = getDb();
    const targetCities = ["delhi", "gurugram", "mumbai", "bengaluru", "chandigarh"];

    for (const slug of targetCities) {
      const cityRows = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          stationCount: cities.stationCount,
          latitude: cities.latitude,
          longitude: cities.longitude,
        })
        .from(cities)
        .where(eq(cities.slug, slug));

      if (cityRows.length > 0) {
        const city = cityRows[0];
        // Count distinct operators in this city
        const opCountResult = await db
          .select({
            count: sql<number>`count(distinct ${stations.operatorId})`,
          })
          .from(stations)
          .where(eq(stations.cityId, city.id));

        const opCount = Number(opCountResult[0]?.count ?? 0);

        console.log(`City: ${city.name} (${city.slug})`);
        console.log(`  Station Count: ${city.stationCount}`);
        console.log(`  Operator Count: ${opCount}`);
        console.log(`  Coordinates: (${city.latitude}, ${city.longitude})`);
        console.log("");
      } else {
        console.log(`City: ${slug} (Not yet discovered in dataset)\n`);
      }
    }

    // Check representative PIN 110001
    const pin110001 = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(stations)
      .where(eq(stations.pincode, "110001"));

    console.log(`Representative PIN 110001:`);
    console.log(`  Stations: ${pin110001[0]?.count ?? 0}\n`);

    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error(
      "City Discovery Failed:",
      error instanceof Error ? error.message : String(error),
    );
    try {
      const { closeDb } = await import("@/lib/db/client");
      await closeDb();
    } catch {
      // Ignore cleanup error
    }
    process.exit(1);
  }
}

void main();
