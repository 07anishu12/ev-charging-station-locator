import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import pg from "pg";
import { projectRoot } from "./runtime.mjs";

// Dependency order for restoring foreign keys into a newly migrated database.
export const snapshotTables = [
  "states", "districts", "cities", "city_aliases", "localities", "pincodes",
  "operators", "providers", "stations", "connectors", "sync_logs", "station_provider_mappings",
  "status_observations", "manual_status_overrides", "data_quality_issues",
];
export const snapshotDirectory = resolve(projectRoot, "data/snapshot");

export async function verifyResearchFiles() {
  const manifest = JSON.parse(await readFile(resolve(projectRoot, "data/research-manifest.json"), "utf8"));
  if (manifest.formatVersion !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== 10) throw new Error("Research file manifest is incomplete.");
  for (const file of manifest.files) {
    if (!/^research\/ev-india\/datasets\/[^/]+$/.test(file.path) || file.path.includes("..")) throw new Error("Invalid research manifest path.");
    const bytes = await readFile(resolve(projectRoot, file.path));
    if (bytes.length !== file.bytes || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Research dataset integrity check failed: ${file.path}`);
  }
}

export async function readSnapshot() {
  await verifyResearchFiles();
  const manifest = JSON.parse(await readFile(resolve(snapshotDirectory, "manifest.json"), "utf8"));
  const bytes = await readFile(resolve(snapshotDirectory, "india-charging.json.gz"));
  const journal = await readFile(resolve(projectRoot, "database/migrations/meta/_journal.json"));
  if (manifest.migrationJournalSha256 !== createHash("sha256").update(journal).digest("hex")) {
    throw new Error("The bundled dataset targets a different migration version. Update the snapshot before running setup.");
  }
  if (manifest.formatVersion !== 1 || createHash("sha256").update(bytes).digest("hex") !== manifest.sha256) {
    throw new Error("The bundled dataset failed its integrity check. Restore data/snapshot from Git and retry setup.");
  }
  const snapshot = JSON.parse(gunzipSync(bytes).toString("utf8"));
  if (snapshot.formatVersion !== 1 || snapshotTables.some(table => !Array.isArray(snapshot.tables?.[table]) || snapshot.tables[table].length !== manifest.counts?.[table])) {
    throw new Error("Bundled dataset counts or format do not match the manifest.");
  }
  return { manifest, snapshot };
}

export async function restoreSnapshot() {
  const { manifest, snapshot } = await readSnapshot();
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // An import must never merge over an existing, partially populated canonical database.
    await client.query(`LOCK TABLE ${snapshotTables.map(t => `public.${t}`).join(", ")} IN EXCLUSIVE MODE`);
    for (const table of snapshotTables) {
      const result = await client.query(`SELECT count(*)::int AS count FROM public.${table}`);
      if (result.rows[0].count !== 0) {
        throw new Error(`Snapshot restore requires empty canonical tables (${table} already has data). Use a new database, or import your research CSV into the existing database.`);
      }
    }
    for (const table of snapshotTables) {
      const rows = snapshot.tables[table];
      for (let offset = 0; offset < rows.length; offset += 1000) {
        // Table names come only from the fixed list above. Record values stay parameterized.
        await client.query(`INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, $1::jsonb)`, [JSON.stringify(rows.slice(offset, offset + 1000))]);
      }
      console.log(`Loaded ${table}: ${rows.length.toLocaleString("en-IN")} records.`);
    }
    const counts = await client.query("SELECT count(*)::int AS stations FROM stations");
    if (counts.rows[0].stations !== manifest.counts.stations) throw new Error("Restored station count did not match the snapshot.");
    await client.query("COMMIT");
    console.log(`Restored bundled snapshot: ${counts.rows[0].stations.toLocaleString("en-IN")} station records (${manifest.exportedAt}).`);
  } catch (error) {
    await client.query("ROLLBACK");
    // Preserve deliberate diagnostics, without printing pg statements or credentials.
    if (error.code) throw new Error("Snapshot restore failed. Verify database permissions and run migrations; the restore transaction was rolled back.");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
