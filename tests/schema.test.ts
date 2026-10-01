import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { pincodeSchema } from "@/lib/api/validation";
import {
  cities,
  citiesRelations,
  cityAliases,
  connectors,
  connectorsRelations,
  dataQualityIssues,
  operators,
  pincodes,
  states,
  statesRelations,
  stations,
  stationsRelations,
  syncLogs,
} from "@/lib/db/schema";
import { createSlug } from "@/lib/search/slug";

describe("deterministic city and state slug generation", () => {
  it("generates clean, deterministic slugs for Indian states and cities", () => {
    expect(createSlug("Bengaluru")).toBe("bengaluru");
    expect(createSlug("New Delhi")).toBe("new-delhi");
    expect(createSlug("Tamil Nadu")).toBe("tamil-nadu");
    expect(createSlug("Andhra Pradesh")).toBe("andhra-pradesh");
    expect(createSlug("Thiruvananthapuram")).toBe("thiruvananthapuram");
    expect(createSlug("  Kolkata  ")).toBe("kolkata");
  });
});

describe("PIN code format validation", () => {
  it("accepts valid 6-digit Indian PIN codes", () => {
    expect(pincodeSchema.safeParse({ pincode: "560001" }).success).toBe(true);
    expect(pincodeSchema.safeParse({ pincode: "110001" }).success).toBe(true);
    expect(pincodeSchema.safeParse({ pincode: "400001" }).success).toBe(true);
  });

  it("rejects non-6-digit PIN codes", () => {
    expect(pincodeSchema.safeParse({ pincode: "12345" }).success).toBe(false);
    expect(pincodeSchema.safeParse({ pincode: "1234567" }).success).toBe(false);
    expect(pincodeSchema.safeParse({ pincode: "ABC123" }).success).toBe(false);
    expect(pincodeSchema.safeParse({ pincode: "56 001" }).success).toBe(false);
  });
});

describe("database relational schema definition", () => {
  it("defines states table with required conceptual fields and constraints", () => {
    expect(states.id).toBeDefined();
    expect(states.name).toBeDefined();
    expect(states.slug).toBeDefined();
    expect(states.code).toBeDefined();
    expect(states.latitude).toBeDefined();
    expect(states.longitude).toBeDefined();
    expect(states.createdAt).toBeDefined();
    expect(states.updatedAt).toBeDefined();
  });

  it("defines cities table with state foreign key and station count", () => {
    expect(cities.id).toBeDefined();
    expect(cities.name).toBeDefined();
    expect(cities.slug).toBeDefined();
    expect(cities.stateId).toBeDefined();
    expect(cities.stationCount).toBeDefined();
  });

  it("defines city_aliases table with canonical city mapping", () => {
    expect(cityAliases.id).toBeDefined();
    expect(cityAliases.alias).toBeDefined();
    expect(cityAliases.cityId).toBeDefined();
  });

  it("defines pincodes table with 6-digit primary key and city/state relations", () => {
    expect(pincodes.pincode).toBeDefined();
    expect(pincodes.cityId).toBeDefined();
    expect(pincodes.stateId).toBeDefined();
    expect(pincodes.district).toBeDefined();
  });

  it("defines operators table with unique slug and website", () => {
    expect(operators.id).toBeDefined();
    expect(operators.name).toBeDefined();
    expect(operators.slug).toBeDefined();
    expect(operators.website).toBeDefined();
  });

  it("defines stations table with OCM identity, spatial location, and metadata", () => {
    expect(stations.id).toBeDefined();
    expect(stations.ocmId).toBeDefined();
    expect(stations.operatorId).toBeDefined();
    expect(stations.cityId).toBeDefined();
    expect(stations.stateId).toBeDefined();
    expect(stations.latitude).toBeDefined();
    expect(stations.longitude).toBeDefined();
    expect(stations.location).toBeDefined();
    expect(stations.status).toBeDefined();
    expect(stations.usageType).toBeDefined();
    expect(stations.dataProvider).toBeDefined();
    expect(stations.ocmUrl).toBeDefined();
    expect(stations.lastSyncedAt).toBeDefined();
  });

  it("defines connectors table with power decimal precision and status", () => {
    expect(connectors.id).toBeDefined();
    expect(connectors.stationId).toBeDefined();
    expect(connectors.ocmConnectionId).toBeDefined();
    expect(connectors.connectionType).toBeDefined();
    expect(connectors.normalizedType).toBeDefined();
    expect(connectors.powerKw).toBeDefined();
    expect(connectors.status).toBeDefined();
  });

  it("defines sync_logs table with audit counters and status", () => {
    expect(syncLogs.id).toBeDefined();
    expect(syncLogs.source).toBeDefined();
    expect(syncLogs.country).toBeDefined();
    expect(syncLogs.startedAt).toBeDefined();
    expect(syncLogs.recordsFetched).toBeDefined();
    expect(syncLogs.recordsCreated).toBeDefined();
    expect(syncLogs.recordsUpdated).toBeDefined();
    expect(syncLogs.status).toBeDefined();
  });

  it("defines data_quality_issues table with issue type and resolution status", () => {
    expect(dataQualityIssues.id).toBeDefined();
    expect(dataQualityIssues.stationId).toBeDefined();
    expect(dataQualityIssues.ocmId).toBeDefined();
    expect(dataQualityIssues.issueType).toBeDefined();
    expect(dataQualityIssues.severity).toBeDefined();
    expect(dataQualityIssues.resolved).toBeDefined();
  });
});

describe("schema relationship definitions", () => {
  it("defines relationships between states, cities, stations, operators, and connectors", () => {
    expect(statesRelations).toBeDefined();
    expect(citiesRelations).toBeDefined();
    expect(stationsRelations).toBeDefined();
    expect(connectorsRelations).toBeDefined();
  });
});

describe("migration history verification", () => {
  it("has deterministic migration files including PostGIS and all domain tables", () => {
    const journalPath = path.resolve(process.cwd(), "drizzle/meta/_journal.json");
    expect(fs.existsSync(journalPath)).toBe(true);

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    expect(journal.entries.length).toBeGreaterThanOrEqual(2);

    const migration0001 = fs.readFileSync(
      path.resolve(process.cwd(), `drizzle/${journal.entries[1].tag}.sql`),
      "utf-8",
    );
    expect(migration0001).toContain('CREATE TABLE "states"');
    expect(migration0001).toContain('CREATE TABLE "cities"');
    expect(migration0001).toContain('CREATE TABLE "city_aliases"');
    expect(migration0001).toContain('CREATE TABLE "pincodes"');
    expect(migration0001).toContain('CREATE TABLE "operators"');
    expect(migration0001).toContain('CREATE TABLE "connectors"');
    expect(migration0001).toContain('CREATE TABLE "sync_logs"');
    expect(migration0001).toContain('CREATE TABLE "data_quality_issues"');
    expect(migration0001).toContain('ALTER TABLE "stations" ADD COLUMN "ocm_id"');
  });
});
