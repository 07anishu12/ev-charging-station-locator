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
  districts,
  districtsRelations,
  localities,
  localitiesRelations,
  objectMetadata,
  operators,
  pincodes,
  states,
  statesRelations,
  stations,
  stationsRelations,
  stationProviderMappings,
  stationProviderMappingsRelations,
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

  it("defines districts table with state foreign key and geographic coordinates", () => {
    expect(districts.id).toBeDefined();
    expect(districts.name).toBeDefined();
    expect(districts.slug).toBeDefined();
    expect(districts.stateId).toBeDefined();
    expect(districts.latitude).toBeDefined();
    expect(districts.longitude).toBeDefined();
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

  it("defines localities table with city/district references, spatial location, and station count", () => {
    expect(localities.id).toBeDefined();
    expect(localities.name).toBeDefined();
    expect(localities.slug).toBeDefined();
    expect(localities.cityId).toBeDefined();
    expect(localities.stateId).toBeDefined();
    expect(localities.districtId).toBeDefined();
    expect(localities.pincode).toBeDefined();
    expect(localities.location).toBeDefined();
    expect(localities.stationCount).toBeDefined();
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
    expect(stations.verificationStatus).toBeDefined();
    expect(stations.usageType).toBeDefined();
    expect(stations.dataProvider).toBeDefined();
    expect(stations.ocmUrl).toBeDefined();
    expect(stations.lastSyncedAt).toBeDefined();
  });

  it("defines station_provider_mappings table for multi-provider upstream identity", () => {
    expect(stationProviderMappings.id).toBeDefined();
    expect(stationProviderMappings.stationId).toBeDefined();
    expect(stationProviderMappings.providerName).toBeDefined();
    expect(stationProviderMappings.providerStationId).toBeDefined();
    expect(stationProviderMappings.rawData).toBeDefined();
    expect(stationProviderMappings.lastSyncedAt).toBeDefined();
  });

  it("defines connectors table with power decimal precision and status", () => {
    expect(connectors.id).toBeDefined();
    expect(connectors.stationId).toBeDefined();
    expect(connectors.ocmConnectionId).toBeDefined();
    expect(connectors.ocmConnectionId.isUnique).toBe(true);
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

  it("defines object_metadata table for S3/R2/MinIO raw artifact tracking", () => {
    expect(objectMetadata.id).toBeDefined();
    expect(objectMetadata.objectKey).toBeDefined();
    expect(objectMetadata.bucket).toBeDefined();
    expect(objectMetadata.contentType).toBeDefined();
    expect(objectMetadata.sizeBytes).toBeDefined();
    expect(objectMetadata.checksumSha256).toBeDefined();
    expect(objectMetadata.source).toBeDefined();
    expect(objectMetadata.provider).toBeDefined();
    expect(objectMetadata.jobId).toBeDefined();
    expect(objectMetadata.retentionDays).toBeDefined();
    expect(objectMetadata.expiresAt).toBeDefined();
    expect(objectMetadata.metadata).toBeDefined();
  });
});

describe("schema relationship definitions", () => {
  it("defines relationships between states, districts, cities, localities, stations, operators, connectors, and provider mappings", () => {
    expect(statesRelations).toBeDefined();
    expect(districtsRelations).toBeDefined();
    expect(citiesRelations).toBeDefined();
    expect(localitiesRelations).toBeDefined();
    expect(stationsRelations).toBeDefined();
    expect(stationProviderMappingsRelations).toBeDefined();
    expect(connectorsRelations).toBeDefined();
  });
});

describe("migration history verification", () => {
  it("has deterministic migration files including PostGIS and all domain tables", () => {
    const journalPath = path.resolve(process.cwd(), "drizzle/meta/_journal.json");
    expect(fs.existsSync(journalPath)).toBe(true);

    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
    expect(journal.entries.length).toBeGreaterThanOrEqual(5);

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

    const migration0003 = fs.readFileSync(
      path.resolve(process.cwd(), `drizzle/${journal.entries[3].tag}.sql`),
      "utf-8",
    );
    expect(migration0003).toContain('CREATE TABLE IF NOT EXISTS "districts"');
    expect(migration0003).toContain('CREATE TABLE IF NOT EXISTS "localities"');
    expect(migration0003).toContain('CREATE TABLE IF NOT EXISTS "station_provider_mappings"');
    expect(migration0003).toContain('ALTER TABLE "stations" ADD COLUMN IF NOT EXISTS "verification_status"');
    expect(migration0003).toContain('"localities_location_gist_idx"');

    const migration0004 = fs.readFileSync(
      path.resolve(process.cwd(), `drizzle/${journal.entries[4].tag}.sql`),
      "utf-8",
    );
    expect(migration0004).toContain('CREATE TABLE IF NOT EXISTS "object_metadata"');
    expect(migration0004).toContain('"object_metadata_key_unique_idx"');
  });
});
