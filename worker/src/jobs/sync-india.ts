import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (!process.env.OPENCHARGEMAP_API_KEY) {
    console.error("Error: OPENCHARGEMAP_API_KEY is not configured.");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not configured.");
    process.exit(1);
  }

  const { ingestStations } = await import("../ingestion/ingest-stations");
  const { closeDb } = await import("@fastcharger/database");

  try {
    const result = await ingestStations();
    console.log("FastCharger India Sync Complete");
    console.log(`Fetched: ${result.fetched}, Created: ${result.created}, Updated: ${result.updated}`);
    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("FastCharger India Sync Failed:", error);
    try {
      const { closeDb } = await import("@fastcharger/database");
      await closeDb();
    } catch {}
    process.exit(1);
  }
}

void main();
