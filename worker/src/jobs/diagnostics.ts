/** Actionable CLI diagnostics without printing connection strings or provider credentials. */
export function describeDataCommandError(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const detail = current as { code?: string; status?: number; cause?: unknown };
    switch (detail.code) {
      case "0A000":
      case "58P01":
        return "A required PostgreSQL extension or feature is unavailable. Install PostGIS on this server or use npm run db:up with the Docker PostGIS image.";
      case "42501":
        return "Database permissions are insufficient. Migrations require permission to create schemas, tables and the PostGIS extension.";
      case "42P01":
        return "Database tables are missing. Run npm run db:migrate before importing station data.";
      case "ECONNREFUSED":
      case "ENOTFOUND":
      case "ETIMEDOUT":
      case "28P01":
      case "3D000":
        return "PostgreSQL is unreachable or rejected the connection. Check DATABASE_URL and start your database.";
      case "ENOENT":
        return "A required input file or executable is missing. Check RESEARCH_STATIONS_FILE; BEE imports require Python 3, pypdf and Poppler's pdftotext.";
    }
    if (detail.status === 401 || detail.status === 403) {
      return "The provider rejected access. Check the provider API key and access permissions.";
    }
    current = detail.cause;
  }
  return "Inspect ingestion_runs and source_errors/data_quality_issues for details. Check provider credentials, network access and input files.";
}
