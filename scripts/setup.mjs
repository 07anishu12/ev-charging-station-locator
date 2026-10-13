import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { inspectDatabase, loadEnvironment, projectRoot, runCommand, runDataCommand } from "./runtime.mjs";

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function main() {
  if (!await exists(resolve(projectRoot, ".env.local")) && !await exists(resolve(projectRoot, ".env")) && !process.env.DATABASE_URL) {
    await copyFile(resolve(projectRoot, ".env.example"), resolve(projectRoot, ".env.local"), constants.COPYFILE_EXCL);
    console.log("Created .env.local from .env.example. Existing configuration is never overwritten.");
  }
  loadEnvironment();
  try {
    await inspectDatabase({ requireSchema: false, requireData: false });
  } catch (error) {
    // Only provision the documented local Docker default. Never change an external database URL.
    if (process.env.DATABASE_URL !== "postgresql://postgres:postgres@127.0.0.1:5432/fastcharger") throw error;
    console.log("Starting local PostgreSQL + PostGIS. Docker Desktop must be running.");
    try {
      await runCommand("docker", ["compose", "-f", "infrastructure/docker-compose.yml", "up", "-d", "--wait", "postgres"]);
    } catch {
      throw new Error("Could not start Docker PostgreSQL. Start Docker Desktop and retry npm run setup, or set DATABASE_URL to a running native/hosted PostgreSQL + PostGIS server.");
    }
    await inspectDatabase({ requireSchema: false, requireData: false });
  }

  console.log("Applying database migrations...");
  await runDataCommand("migrate");
  let count = await inspectDatabase({ requireData: false });
  if (count === 0) {
    const file = process.env.RESEARCH_STATIONS_FILE || resolve(projectRoot, "research/ev-india/datasets/india-master.csv");
    if (process.env.RESEARCH_STATIONS_FILE && !await exists(file)) {
      throw new Error("RESEARCH_STATIONS_FILE does not exist. Correct its path in .env.local and rerun npm run setup.");
    }
    if (await exists(file)) {
      console.log("Importing real station records from the configured research CSV...");
      await runDataCommand("import");
    } else if (process.env.OCM_API_KEY?.trim() || process.env.OPENCHARGEMAP_API_KEY?.trim()) {
      console.log("Importing India station records from Open Charge Map...");
      await runDataCommand("ocm");
    } else {
      throw new Error("Schema is ready, but no station data is installed. Set OCM_API_KEY or RESEARCH_STATIONS_FILE in .env.local and rerun npm run setup. Research datasets are not included in Git. Alternatively run npm run sync:bee after installing Python 3, pypdf and Poppler, then rerun setup. No sample stations will be substituted.");
    }
    count = await inspectDatabase();
  }
  console.log(`Setup complete: ${count.toLocaleString("en-IN")} station records. Run npm run dev, or npm run backend and npm run frontend in separate terminals.`);
}

main().catch(error => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exitCode = 1;
});
