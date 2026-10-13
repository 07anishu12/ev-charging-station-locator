import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export function loadEnvironment() {
  config({ path: [resolve(projectRoot, ".env.local"), resolve(projectRoot, ".env")], quiet: true });
}

export function getPorts() {
  const port = (value, fallback) => {
    const parsed = Number(value || fallback);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error("BACKEND_PORT and FRONTEND_PORT must be integers between 1 and 65535.");
    }
    return parsed;
  };
  return {
    backend: port(process.env.BACKEND_PORT || process.env.PORT, 4000),
    frontend: port(process.env.FRONTEND_PORT, 3000),
  };
}

export async function inspectDatabase({ requireSchema = true, requireData = true } = {}) {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is missing. Run npm run setup, or configure a PostgreSQL + PostGIS URL in .env.local.");
  }
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    max: 1,
  });
  try {
    await pool.query("SELECT 1");
    if (!requireSchema) return 0;
    const schema = await pool.query(`SELECT
      to_regclass('stations') IS NOT NULL AND
      to_regclass('station_status') IS NOT NULL AND
      to_regclass('connector_status') IS NOT NULL AND
      to_regclass('station_provider_mappings') IS NOT NULL AND
      to_regclass('providers') IS NOT NULL AS ready`);
    if (!schema.rows[0].ready) {
      throw new Error("Database schema is missing or outdated. Run npm run setup to apply migrations and import station data.");
    }
    await pool.query("SELECT postgis_version()");
    const result = await pool.query("SELECT count(*)::int AS count FROM stations");
    const count = result.rows[0].count;
    if (requireData && count === 0) {
      throw new Error("Database is connected but contains no charging stations. Run npm run setup with OCM_API_KEY or RESEARCH_STATIONS_FILE configured. Code installation does not include provider data.");
    }
    return count;
  } catch (error) {
    if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "28P01", "3D000"].includes(error.code) || error instanceof AggregateError) {
      throw new Error("Cannot connect to PostgreSQL. Check DATABASE_URL and start your database. For Docker, start Docker Desktop, then run npm run db:up and npm run setup.");
    }
    if (error.code === "42883") {
      throw new Error("PostGIS is unavailable. Use a PostgreSQL server with PostGIS installed, then run npm run setup.");
    }
    // pg errors can contain connection details; expose only our own diagnostics.
    if (error.code || error.message?.includes("timeout")) {
      throw new Error("Database verification failed. Check PostgreSQL access, PostGIS and migrations using npm run setup.");
    }
    throw error;
  } finally {
    await pool.end();
  }
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, stdio: "inherit", ...options });
    child.once("error", () => reject(new Error(`Could not start ${command}. Check that it is installed.`)));
    child.once("exit", (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} failed (${signal || code}). See the output above.`));
    });
  });
}

export function runDataCommand(command) {
  return runCommand(process.execPath, [resolve(projectRoot, "node_modules/tsx/dist/cli.mjs"), "worker/src/jobs/data-platform.ts", command]);
}
