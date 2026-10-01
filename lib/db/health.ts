import "server-only";

import { sql } from "drizzle-orm";

import { appConfig } from "@/lib/config";
import { getDb } from "@/lib/db/client";

export interface DatabaseHealth {
  ok: boolean;
  message?: string;
}

/**
 * Server-side health utility to verify whether the PostgreSQL database connection
 * can be established.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!appConfig.database.url) {
    return {
      ok: false,
      message: "DATABASE_URL is not configured.",
    };
  }

  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Database connection failed.",
    };
  }
}
