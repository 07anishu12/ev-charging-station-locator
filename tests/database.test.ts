import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseEnvironment } from "@/lib/config/env-schema";
import { checkDatabaseHealth, getDb } from "@/lib/db/client";
import { stations } from "@/lib/db/schema";

describe("database environment validation", () => {
  it("accepts valid postgresql:// and postgres:// connection URLs", () => {
    const postgresqlResult = parseEnvironment({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/fastcharger",
    });
    expect(postgresqlResult.databaseUrl).toBe(
      "postgresql://postgres:postgres@localhost:5432/fastcharger",
    );

    const postgresResult = parseEnvironment({
      DATABASE_URL: "postgres://user:pass@localhost:5432/fastcharger",
    });
    expect(postgresResult.databaseUrl).toBe("postgres://user:pass@localhost:5432/fastcharger");
  });

  it("handles missing or empty DATABASE_URL by defaulting to null", () => {
    expect(parseEnvironment({}).databaseUrl).toBeNull();
    expect(parseEnvironment({ DATABASE_URL: "" }).databaseUrl).toBeNull();
    expect(parseEnvironment({ DATABASE_URL: "   " }).databaseUrl).toBeNull();
  });

  it("rejects invalid URLs and non-postgres protocols", () => {
    expect(() => parseEnvironment({ DATABASE_URL: "invalid-url" })).toThrow();
    expect(() => parseEnvironment({ DATABASE_URL: "http://localhost:5432/fastcharger" })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
    expect(() => parseEnvironment({ DATABASE_URL: "mysql://user:pass@localhost:3306/db" })).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
  });
});

describe("database client & health utility behavior", () => {
  it("throws a clear error when getDb() is called without DATABASE_URL configured", () => {
    expect(() => getDb()).toThrow("DATABASE_URL is not configured.");
  });

  it("returns ok: false without throwing when checkDatabaseHealth() is called without DATABASE_URL", async () => {
    const health = await checkDatabaseHealth();
    expect(health.ok).toBe(false);
    expect(health.message).toBe("DATABASE_URL is not configured.");
  });
});

describe("database schema and migration configuration", () => {
  it("defines the station location using geography(Point,4326)", () => {
    expect(stations.location.dataType).toBe("custom");
    expect(stations.location.getSQLType()).toBe("geography(Point,4326)");
  });

  it("includes PostGIS extension and GiST index in the initial migration", () => {
    const migrationPath = path.resolve(process.cwd(), "drizzle/0000_powerful_gamma_corps.sql");
    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    expect(migrationSql).toContain("CREATE EXTENSION IF NOT EXISTS postgis;");
    expect(migrationSql).toContain('CREATE INDEX "stations_location_gist_idx" ON "stations" USING gist ("location");');
    expect(migrationSql).toContain('"location" "geography(Point,4326)" NOT NULL');
  });
});
