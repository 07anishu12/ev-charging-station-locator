import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

export interface DatabaseHealth {
  ok: boolean;
  message?: string;
}

/**
 * Checks whether the PostgreSQL database connection can be established.
 */
export async function checkDatabaseHealth(
  db?: NodePgDatabase<typeof schema> | null,
  databaseUrl?: string | null,
): Promise<DatabaseHealth> {
  const connectionUrl = databaseUrl || process.env.DATABASE_URL;
  if (!connectionUrl) {
    return {
      ok: false,
      message: "DATABASE_URL is not configured.",
    };
  }

  if (!db) {
    return {
      ok: false,
      message: "Database client instance is not initialized.",
    };
  }

  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Database connection failed.",
    };
  }
}
