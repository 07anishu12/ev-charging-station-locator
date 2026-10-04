import { getDb, closeDb, checkDatabaseHealth, type DatabaseHealth } from "@fastcharger/database";
import { DatabaseUnavailableError } from "../domain/errors";

export function getDatabase() {
  try {
    return getDb();
  } catch {
    throw new DatabaseUnavailableError("Database is not configured or currently unreachable.");
  }
}

export async function checkDbConnection(): Promise<DatabaseHealth> {
  return checkDatabaseHealth();
}

export async function shutdownDatabase(): Promise<void> {
  await closeDb();
}
