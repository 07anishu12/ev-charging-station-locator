import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not configured.");
    process.exit(1);
  }

  const { discoverCities } = await import("../discovery/discover-cities");
  const { closeDb } = await import("@fastcharger/database");

  try {
    const result = await discoverCities();
    console.log(`Discovered ${result.citiesDiscovered} cities from ${result.totalStationsProcessed} stations.`);
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("City discovery failed:", error);
    try {
      const { closeDb } = await import("@fastcharger/database");
      await closeDb();
    } catch {}
    process.exit(1);
  }
}

void main();
