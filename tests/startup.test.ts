import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pool = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));
vi.mock("pg", () => ({ default: { Pool: vi.fn(function () { return pool; }) } }));

import { getPorts, inspectDatabase } from "../scripts/runtime.mjs";
import { getBaseUrl } from "@/lib/api/client";
import { describeDataCommandError } from "@/worker/src/jobs/diagnostics";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, DATABASE_URL: "postgresql://localhost/synthetic_startup_test" };
  pool.query.mockReset();
  pool.end.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

function healthyDatabase(count: number) {
  // Synthetic pg responses for the startup guard; no real station data is generated.
  pool.query.mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ ready: true }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ count }] });
}

describe("application startup diagnostics", () => {
  it("explains missing configuration before opening a connection", async () => {
    delete process.env.DATABASE_URL;
    await expect(inspectDatabase()).rejects.toThrow("DATABASE_URL is missing");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("distinguishes an unmigrated database from a connection failure", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ ready: false }] });
    await expect(inspectDatabase()).rejects.toThrow("schema is missing or outdated");
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("requires imported station data for application startup", async () => {
    healthyDatabase(0);
    await expect(inspectDatabase()).rejects.toThrow("no charging stations");
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("allows an empty database during first-time setup", async () => {
    healthyDatabase(0);
    await expect(inspectDatabase({ requireData: false })).resolves.toBe(0);
  });

  it("returns a measured count when the database is ready", async () => {
    healthyDatabase(12);
    await expect(inspectDatabase()).resolves.toBe(12);
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("reports missing PostGIS explicitly", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ ready: true }] })
      .mockRejectedValueOnce(Object.assign(new Error("synthetic missing function"), { code: "42883" }));
    await expect(inspectDatabase()).rejects.toThrow("PostGIS is unavailable");
  });

  it("masks driver errors and gives a database recovery command", async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error("synthetic-password"), { code: "28P01" }));
    await expect(inspectDatabase()).rejects.toThrow("Cannot connect to PostgreSQL");
    expect(pool.end).toHaveBeenCalledOnce();
  });

  it("checks custom ports and rejects invalid values", () => {
    process.env.BACKEND_PORT = "4100";
    process.env.FRONTEND_PORT = "3100";
    expect(getPorts()).toEqual({ backend: 4100, frontend: 3100 });
    process.env.BACKEND_PORT = "-1";
    expect(() => getPorts()).toThrow("between 1 and 65535");
  });
});

describe("portable frontend API destination", () => {
  it("uses the frontend proxy even with an old localhost public URL", () => {
    vi.stubGlobal("window", {});
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    expect(getBaseUrl()).toBe("");
  });

  it("prefers the server-only destination for server rendering", () => {
    vi.stubGlobal("window", undefined);
    process.env.API_URL = "http://127.0.0.1:4100/";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    expect(getBaseUrl()).toBe("http://127.0.0.1:4100");
  });
});

describe("first-time migration diagnostics", () => {
  it("explains a nested PostGIS error without exposing SQL or credentials", () => {
    const error = { message: "synthetic SQL and password", cause: { code: "0A000", message: "synthetic private server path" } };
    expect(describeDataCommandError(error)).toContain("Install PostGIS");
    expect(describeDataCommandError(error)).not.toContain("synthetic");
  });

  it("gives a permissions explanation for migration access failures", () => {
    expect(describeDataCommandError({ cause: { code: "42501" } })).toContain("permissions are insufficient");
  });
});
