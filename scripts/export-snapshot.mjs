import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import pg from "pg";
import { loadEnvironment, projectRoot, runCommand } from "./runtime.mjs";
import { snapshotDirectory, snapshotTables } from "./snapshot.mjs";

async function main() {
  loadEnvironment();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to export station data.");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables = {};
    const counts = {};
    for (const table of snapshotTables) {
      const key = table === "providers" ? "provider_id" : table === "pincodes" ? "pincode" : "id";
      const result = await client.query(`SELECT * FROM public.${table} ORDER BY ${key}`);
      tables[table] = result.rows;
      counts[table] = result.rows.length;
    }
    await client.query("COMMIT");
    if (!counts.stations) throw new Error("Refusing to export an empty station dataset.");
    const snapshot = { formatVersion: 1, tables };
    const json = JSON.stringify(snapshot);
    const privateValues = Object.entries(process.env)
      .filter(([name, value]) => /KEY|TOKEN|SECRET|PASSWORD/.test(name) && value && value.length >= 8)
      .map(([, value]) => value);
    if (privateValues.some(value => json.includes(value))) throw new Error("A private credential was detected in exported records. No snapshot was written.");
    const bytes = gzipSync(json, { level: 9 });
    const journal = await readFile(resolve(projectRoot, "database/migrations/meta/_journal.json"));
    const manifest = {
      formatVersion: 1, exportedAt: new Date().toISOString(),
      file: "india-charging.json.gz", sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length, migrationJournalSha256: createHash("sha256").update(journal).digest("hex"),
      counts,
      discoveryCounts: {
        stations: counts.stations,
        cities: new Set(tables.stations.map(row => row.city_id).filter(Boolean)).size,
        operators: new Set(tables.stations.map(row => row.operator_id).filter(Boolean)).size,
      },
      attribution: "See data/DATA_SOURCES.md and research/ev-india/datasets/station-sources.csv. Source licenses are retained; this is a dated inventory snapshot, not a live availability feed.",
    };
    await mkdir(snapshotDirectory, { recursive: true });
    await writeFile(resolve(snapshotDirectory, "india-charging.json.gz"), bytes);
    await writeFile(resolve(snapshotDirectory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    await runCommand(process.execPath, [resolve(projectRoot, "node_modules/tsx/dist/cli.mjs"), "scripts/research-manifest.ts"]);
    console.log(JSON.stringify(manifest, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(() => {
  console.error("Snapshot export failed. Check database access, schema and credentials in source records; no secrets are printed.");
  process.exitCode = 1;
});
