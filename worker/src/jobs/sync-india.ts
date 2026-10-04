import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (!isDryRun && !process.env.OPENCHARGEMAP_API_KEY) {
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
    console.log(`[INGESTION] Starting FastCharger India Ingestion${isDryRun ? " (DRY RUN)" : ""}...`);
    const result = await ingestStations({
      maxResults: isDryRun ? 10 : 5000,
    });

    console.log("\n==================================================");
    console.log("FASTCHARGER INGESTION RUN SUMMARY");
    console.log("==================================================");
    console.log(`Run ID:      ${result.runId}`);
    console.log(`Provider:    ${result.provider}`);
    console.log(`Started:     ${result.started.toISOString()}`);
    console.log(`Completed:   ${result.completed.toISOString()}`);
    console.log(`Duration:    ${result.durationSeconds}s`);
    console.log(`Received:    ${result.received}`);
    console.log(`Validated:   ${result.validated}`);
    console.log(`Rejected:    ${result.rejected}`);
    console.log(`Inserted:    ${result.inserted}`);
    console.log(`Updated:     ${result.updated}`);
    console.log(`Duplicates:  ${result.duplicates}`);
    console.log(`Errors:      ${result.errors}`);
    if (result.archivedObjectKey) {
      console.log(`Archived:    ${result.archivedObjectKey}`);
    }
    console.log("==================================================\n");

    await closeDb();
    process.exit(0);
  } catch (error) {
    console.error("\n[FATAL] FastCharger Ingestion Failed:", error);
    try {
      const { closeDb } = await import("@fastcharger/database");
      await closeDb();
    } catch {}
    process.exit(1);
  }
}

void main();
