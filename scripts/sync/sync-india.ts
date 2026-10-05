import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (!process.env.OCM_API_KEY && !process.env.OPENCHARGEMAP_API_KEY) {
    console.error("Error: OCM_API_KEY (or OPENCHARGEMAP_API_KEY) is not configured.");
    console.error("Please configure OCM_API_KEY in .env.local or your environment.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not configured.");
    console.error("Please configure DATABASE_URL in .env.local or your environment.");
    process.exit(1);
  }

  // Import after environment variables are loaded
  const { ingestStations } = await import("@fastcharger/worker");
  const { closeDb } = await import("@fastcharger/database");

  try {
    const result = await ingestStations({useTransaction:true,fullSnapshot:true});

    console.log("FastCharger India Sync\n");
    console.log(`Source: ${result.source}`);
    console.log(`Country: ${result.country}\n`);
    console.log(`Fetched: ${result.fetched}`);
    console.log(`Created: ${result.created}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Failed: ${result.failed}\n`);
    console.log(`Operators: ${result.operatorsCount}`);
    console.log(`Stations: ${result.stationsCount}`);
    console.log(`Connectors: ${result.connectorsCount}\n`);
    console.log(`Data quality issues: ${result.dataQualityIssuesCount}\n`);
    console.log(`Duration: ${result.durationSeconds}s`);

    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error(
      "FastCharger India Sync Failed:",
      error instanceof Error ? error.message : String(error),
    );
    try {
      const { closeDb } = await import("@fastcharger/database");
      await closeDb();
    } catch {
      // Ignore cleanup error on fatal exit
    }
    process.exit(1);
  }
}

void main();
