import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { appConfig } from "@/lib/config";
import * as schema from "@/lib/db/schema";

let pool: Pool | undefined;

export function getDb() {
  if (!appConfig.database.url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  pool ??= new Pool({ connectionString: appConfig.database.url });
  return drizzle(pool, { schema });
}
