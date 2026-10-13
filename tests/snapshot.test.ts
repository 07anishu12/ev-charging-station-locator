import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readFile: vi.fn(), query: vi.fn(), release: vi.fn(), end: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("pg", () => ({ default: { Pool: vi.fn(function () {
  return { connect: async () => ({ query: mocks.query, release: mocks.release }), end: mocks.end };
}) } }));
import { readSnapshot, restoreSnapshot, snapshotTables } from "../scripts/snapshot.mjs";

// Synthetic files validate integrity and transaction guards; real restore is checked separately.
const journal = Buffer.from("synthetic migration journal");
const research = Buffer.from("synthetic research export");
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const snapshot = { formatVersion: 1, tables: Object.fromEntries(snapshotTables.map(t => [t, []])) };
const bytes = gzipSync(JSON.stringify(snapshot));
let manifest: Record<string, unknown>;

beforeEach(() => {
  manifest = { formatVersion: 1, sha256: hash(bytes), migrationJournalSha256: hash(journal),
    counts: Object.fromEntries(snapshotTables.map(t => [t, 0])), exportedAt: "synthetic test date" };
  mocks.readFile.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith("research-manifest.json")) return JSON.stringify({ formatVersion: 1,
      files: Array.from({ length: 10 }, (_, i) => ({ path: `research/ev-india/datasets/synthetic-${i}.csv`, bytes: research.length, sha256: hash(research) })) });
    if (path.includes("synthetic-")) return research;
    if (path.endsWith("manifest.json")) return JSON.stringify(manifest);
    if (path.endsWith("_journal.json")) return journal;
    return bytes;
  });
  mocks.query.mockReset().mockResolvedValue({ rows: [{ count: 0, stations: 0 }] });
  mocks.release.mockReset();
  mocks.end.mockReset().mockResolvedValue(undefined);
});

describe("distributed dataset integrity and restore safety", () => {
  it("checks checksums, schema version and table counts", async () => {
    await expect(readSnapshot()).resolves.toHaveProperty("snapshot.tables.stations");
  });
  it("rejects a corrupted compressed snapshot", async () => {
    manifest.sha256 = "synthetic incorrect checksum";
    await expect(readSnapshot()).rejects.toThrow("integrity check");
  });
  it("rejects a dataset for another schema version", async () => {
    manifest.migrationJournalSha256 = "synthetic other schema";
    await expect(readSnapshot()).rejects.toThrow("migration version");
  });
  it("rejects missing or inconsistent table counts", async () => {
    manifest.counts = {};
    await expect(readSnapshot()).rejects.toThrow("counts or format");
  });
  it("rolls back without inserting over populated canonical tables", async () => {
    mocks.query.mockResolvedValue({ rows: [{ count: 1 }] });
    await expect(restoreSnapshot()).rejects.toThrow("requires empty canonical tables");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith("INSERT"))).toBe(false);
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});
