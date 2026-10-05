import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType: () => "geography(Point,4326)",
});

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export const states = pgTable(
  "states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    code: text("code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("states_name_idx").on(table.name)],
);

// ---------------------------------------------------------------------------
// Districts
// ---------------------------------------------------------------------------
export const districts = pgTable(
  "districts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("districts_state_id_idx").on(table.stateId),
    index("districts_slug_idx").on(table.slug),
    index("districts_name_idx").on(table.name),
  ],
);

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------
export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    stationCount: integer("station_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("cities_slug_idx").on(table.slug),
    index("cities_state_id_idx").on(table.stateId),
    index("cities_station_count_idx").on(table.stationCount),
  ],
);

// ---------------------------------------------------------------------------
// City Aliases (e.g. Bangalore -> Bengaluru, Bombay -> Mumbai)
// ---------------------------------------------------------------------------
export const cityAliases = pgTable(
  "city_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alias: text("alias").notNull(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("city_aliases_alias_idx").on(table.alias),
    index("city_aliases_city_id_idx").on(table.cityId),
    uniqueIndex("city_aliases_alias_city_unique_idx").on(table.alias, table.cityId),
  ],
);

// ---------------------------------------------------------------------------
// Localities (Sub-city geographic areas)
// ---------------------------------------------------------------------------
export const localities = pgTable(
  "localities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "cascade" }),
    stateId: uuid("state_id").references(() => states.id, { onDelete: "set null" }),
    districtId: uuid("district_id").references(() => districts.id, { onDelete: "set null" }),
    pincode: varchar("pincode", { length: 6 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    location: geographyPoint("location"),
    stationCount: integer("station_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("localities_city_id_idx").on(table.cityId),
    index("localities_slug_idx").on(table.slug),
    uniqueIndex("localities_city_slug_unique_idx").on(table.cityId, table.slug),
    index("localities_location_gist_idx").using("gist", table.location),
  ],
);

// ---------------------------------------------------------------------------
// PIN Codes (6-digit Indian PIN codes)
// ---------------------------------------------------------------------------
export const pincodes = pgTable(
  "pincodes",
  {
    pincode: varchar("pincode", { length: 6 }).primaryKey(),
    cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    stateId: uuid("state_id").references(() => states.id, { onDelete: "set null" }),
    district: text("district"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pincodes_city_id_idx").on(table.cityId),
    index("pincodes_state_id_idx").on(table.stateId),
    index("pincodes_coordinates_idx").on(table.latitude, table.longitude),
  ],
);

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------
export const operators = pgTable(
  "operators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    website: text("website"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("operators_name_idx").on(table.name)],
);

// ---------------------------------------------------------------------------
// Stations
// ---------------------------------------------------------------------------
export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchCanonicalId: uuid("research_canonical_id").unique(),
    lifecycleState: text("lifecycle_state").default("ACTIVE").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastProviderUpdateAt: timestamp("last_provider_update_at", { withTimezone: true }),
    externalId: text("external_id").unique(),
    ocmId: integer("ocm_id").unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    operatorId: uuid("operator_id").references(() => operators.id, { onDelete: "set null" }),
    address: text("address"),
    cityId: uuid("city_id").references(() => cities.id, { onDelete: "set null" }),
    stateId: uuid("state_id").references(() => states.id, { onDelete: "set null" }),
    district: text("district"),
    pincode: varchar("pincode", { length: 6 }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    location: geographyPoint("location").notNull(),
    status: text("status").default("unknown").notNull(),
    verificationStatus: text("verification_status").default("unverified").notNull(),
    usageType: text("usage_type"),
    dataProvider: text("data_provider").default("Open Charge Map").notNull(),
    dataLicense: text("data_license"),
    ocmUrl: text("ocm_url"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("stations_location_gist_idx").using("gist", table.location),
    index("stations_ocm_id_idx").on(table.ocmId),
    index("stations_city_id_idx").on(table.cityId),
    index("stations_state_id_idx").on(table.stateId),
    index("stations_operator_id_idx").on(table.operatorId),
    index("stations_status_idx").on(table.status),
    index("stations_verification_status_idx").on(table.verificationStatus),
    index("stations_pincode_idx").on(table.pincode),
  ],
);

// ---------------------------------------------------------------------------
// Station Provider Mappings (Multi-provider upstream identity mappings)
// ---------------------------------------------------------------------------
export const stationProviderMappings = pgTable(
  "station_provider_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    providerStationId: text("provider_station_id").notNull(),
    sourceType: text("source_type").default("OTHER_LICENSED_PROVIDER").notNull(),
    sourceUrl: text("source_url"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    ingestionRunId: uuid("ingestion_run_id"),
    missingFromSnapshot: boolean("missing_from_snapshot").default(false).notNull(),
    payloadHash: text("payload_hash"),
    rawData: jsonb("raw_data"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("station_provider_unique_idx").on(table.providerName, table.providerStationId),
    index("station_provider_station_id_idx").on(table.stationId),
  ],
);

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------
export const connectors = pgTable(
  "connectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationId: uuid("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    providerName: text("provider_name"),
    providerConnectorId: text("provider_connector_id"),
    ocmConnectionId: integer("ocm_connection_id").unique(),
    connectionType: text("connection_type").notNull(),
    normalizedType: text("normalized_type").notNull(),
    level: text("level"),
    powerKw: numeric("power_kw", { precision: 8, scale: 2 }),
    voltage: integer("voltage"),
    amps: integer("amps"),
    status: text("status").default("unknown").notNull(),
    quantity: integer("quantity").default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("connector_provider_identity_idx").on(table.stationId, table.providerName, table.providerConnectorId),
    index("connectors_station_id_idx").on(table.stationId),
    index("connectors_normalized_type_idx").on(table.normalizedType),
    index("connectors_ocm_connection_id_idx").on(table.ocmConnectionId),
  ],
);

// ---------------------------------------------------------------------------
// Sync Logs
// ---------------------------------------------------------------------------
export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: text("source").default("open-charge-map").notNull(),
    country: text("country").default("IN").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    recordsFetched: integer("records_fetched").default(0).notNull(),
    recordsCreated: integer("records_created").default(0).notNull(),
    recordsUpdated: integer("records_updated").default(0).notNull(),
    recordsSkipped: integer("records_skipped").default(0).notNull(),
    recordsFailed: integer("records_failed").default(0).notNull(),
    errorCount: integer("error_count").default(0).notNull(),
    status: text("status").default("pending").notNull(),
    recordsUnchanged: integer("records_unchanged").default(0).notNull(),
    recordsMissing: integer("records_missing").default(0).notNull(),
    statusUpdates: integer("status_updates").default(0).notNull(),
    fullSnapshot: boolean("full_snapshot").default(false).notNull(),
    details: jsonb("details"),
  },
  (table) => [
    index("sync_logs_started_at_idx").on(table.startedAt),
    index("sync_logs_status_idx").on(table.status),
  ],
);

// ---------------------------------------------------------------------------
// Data Quality Issues
// ---------------------------------------------------------------------------
export const dataQualityIssues = pgTable(
  "data_quality_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationId: uuid("station_id").references(() => stations.id, { onDelete: "cascade" }),
    ocmId: integer("ocm_id"),
    issueType: text("issue_type").notNull(),
    severity: text("severity").default("warning").notNull(),
    description: text("description").notNull(),
    details: jsonb("details"),
    resolved: boolean("resolved").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("data_quality_issues_station_id_idx").on(table.stationId),
    index("data_quality_issues_ocm_id_idx").on(table.ocmId),
    index("data_quality_issues_issue_type_idx").on(table.issueType),
    index("data_quality_issues_resolved_idx").on(table.resolved),
  ],
);

// ---------------------------------------------------------------------------
// Object Storage Metadata (PostgreSQL stores metadata, not raw payloads)
// ---------------------------------------------------------------------------
export const objectMetadata = pgTable(
  "object_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectKey: text("object_key").notNull().unique(),
    bucket: text("bucket").notNull(),
    contentType: text("content_type").default("application/octet-stream").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256"),
    source: text("source").notNull(),
    provider: text("provider"),
    jobId: text("job_id"),
    retentionDays: integer("retention_days"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("object_metadata_key_unique_idx").on(table.objectKey),
    index("object_metadata_bucket_idx").on(table.bucket),
    index("object_metadata_source_idx").on(table.source),
    index("object_metadata_provider_idx").on(table.provider),
    index("object_metadata_job_id_idx").on(table.jobId),
    index("object_metadata_created_at_idx").on(table.createdAt),
    index("object_metadata_expires_at_idx").on(table.expiresAt),
  ],
);

// ---------------------------------------------------------------------------
// Drizzle Relations
// ---------------------------------------------------------------------------
export const providers=pgTable('providers',{
  providerId:text('provider_id').primaryKey(),providerName:text('provider_name').notNull(),providerType:text('provider_type').notNull(),
  enabled:boolean('enabled').default(false).notNull(),providerStatus:text('provider_status').notNull(),
  supportsStationData:boolean('supports_station_data').notNull(),supportsStatusData:boolean('supports_status_data').notNull(),
  supportsConnectorData:boolean('supports_connector_data').notNull(),supportsPricing:boolean('supports_pricing').notNull(),
  supportsLiveAvailability:boolean('supports_live_availability').notNull(),refreshIntervalSeconds:integer('refresh_interval_seconds').notNull(),
  statusIntervalSeconds:integer('status_interval_seconds'),termsNotes:text('terms_notes').notNull(),
  lastSuccessfulSyncAt:timestamp('last_successful_sync_at',{withTimezone:true}),lastStatusSyncAt:timestamp('last_status_sync_at',{withTimezone:true}),
});
export const statusObservations=pgTable('status_observations',{
  id:uuid('id').defaultRandom().primaryKey(),stationId:uuid('station_id').notNull().references(()=>stations.id),
  connectorId:uuid('connector_id').references(()=>connectors.id),statusKind:text('status_kind').notNull(),status:text('status').notNull(),
  sourceProvider:text('source_provider').notNull(),sourceType:text('source_type').notNull(),
  observedAt:timestamp('observed_at',{withTimezone:true}).notNull(),receivedAt:timestamp('received_at',{withTimezone:true}).defaultNow().notNull(),
  confidence:numeric('confidence').notNull(),rawStatus:jsonb('raw_status').notNull(),ingestionRunId:uuid('ingestion_run_id').references(()=>syncLogs.id),
  priority:integer('priority').notNull(),freshnessSeconds:integer('freshness_seconds').notNull(),
},t=>[index('observations_station_time_idx').on(t.stationId,t.observedAt.desc())]);
export const manualStatusOverrides=pgTable('manual_status_overrides',{
  id:uuid('id').defaultRandom().primaryKey(),stationId:uuid('station_id').notNull().references(()=>stations.id),
  previousStatus:text('previous_status').notNull(),newStatus:text('new_status').notNull(),reason:text('reason').notNull(),changedBy:text('changed_by').notNull(),
  changedAt:timestamp('changed_at',{withTimezone:true}).defaultNow().notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}),
},t=>[index('overrides_station_time_idx').on(t.stationId,t.changedAt.desc())]);
export const quarantinedStationRecords=pgTable('quarantined_station_records',{
  stationId:uuid('station_id').primaryKey(),quarantinedAt:timestamp('quarantined_at',{withTimezone:true}).defaultNow().notNull(),
  reason:text('reason').notNull(),stationRecord:jsonb('station_record').notNull(),connectorRecords:jsonb('connector_records').notNull(),qualityRecords:jsonb('quality_records').notNull(),
});

export const statesRelations = relations(states, ({ many }) => ({
  districts: many(districts),
  cities: many(cities),
  stations: many(stations),
  pincodes: many(pincodes),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  state: one(states, {
    fields: [districts.stateId],
    references: [states.id],
  }),
  localities: many(localities),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  aliases: many(cityAliases),
  localities: many(localities),
  stations: many(stations),
  pincodes: many(pincodes),
}));

export const cityAliasesRelations = relations(cityAliases, ({ one }) => ({
  city: one(cities, {
    fields: [cityAliases.cityId],
    references: [cities.id],
  }),
}));

export const localitiesRelations = relations(localities, ({ one }) => ({
  city: one(cities, {
    fields: [localities.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [localities.stateId],
    references: [states.id],
  }),
  district: one(districts, {
    fields: [localities.districtId],
    references: [districts.id],
  }),
}));

export const pincodesRelations = relations(pincodes, ({ one }) => ({
  city: one(cities, {
    fields: [pincodes.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [pincodes.stateId],
    references: [states.id],
  }),
}));

export const operatorsRelations = relations(operators, ({ many }) => ({
  stations: many(stations),
}));

export const stationsRelations = relations(stations, ({ one, many }) => ({
  operator: one(operators, {
    fields: [stations.operatorId],
    references: [operators.id],
  }),
  city: one(cities, {
    fields: [stations.cityId],
    references: [cities.id],
  }),
  state: one(states, {
    fields: [stations.stateId],
    references: [states.id],
  }),
  connectors: many(connectors),
  providerMappings: many(stationProviderMappings),
  qualityIssues: many(dataQualityIssues),
}));

export const stationProviderMappingsRelations = relations(stationProviderMappings, ({ one }) => ({
  station: one(stations, {
    fields: [stationProviderMappings.stationId],
    references: [stations.id],
  }),
}));

export const connectorsRelations = relations(connectors, ({ one }) => ({
  station: one(stations, {
    fields: [connectors.stationId],
    references: [stations.id],
  }),
}));

export const dataQualityIssuesRelations = relations(dataQualityIssues, ({ one }) => ({
  station: one(stations, {
    fields: [dataQualityIssues.stationId],
    references: [stations.id],
  }),
}));
