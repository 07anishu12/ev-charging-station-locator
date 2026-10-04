import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { checkDatabaseHealth as checkHealth, type DatabaseHealth } from "./health";
import * as schema from "./schema";

let pool: Pool | undefined;
let dbInstance: NodePgDatabase<typeof schema> | undefined;

export function getDb(connectionString?: string): NodePgDatabase<typeof schema> {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = new Pool({ connectionString: url });
    dbInstance = drizzle(pool, { schema });
  }

  return dbInstance!;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    dbInstance = undefined;
  }
}

export async function checkDatabaseHealth(connectionString?: string): Promise<DatabaseHealth> {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }
  try {
    const db = getDb(url);
    return checkHealth(db, url);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Database connection failed.",
    };
  }
}

export type { DatabaseHealth } from "./health";
export { schema };
