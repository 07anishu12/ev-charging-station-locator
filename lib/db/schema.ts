import { relations } from "drizzle-orm";
import {
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
    index("stations_pincode_idx").on(table.pincode),
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
    ocmConnectionId: integer("ocm_connection_id"),
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
// Drizzle Relations
// ---------------------------------------------------------------------------
export const statesRelations = relations(states, ({ many }) => ({
  cities: many(cities),
  stations: many(stations),
  pincodes: many(pincodes),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  state: one(states, {
    fields: [cities.stateId],
    references: [states.id],
  }),
  aliases: many(cityAliases),
  stations: many(stations),
  pincodes: many(pincodes),
}));

export const cityAliasesRelations = relations(cityAliases, ({ one }) => ({
  city: one(cities, {
    fields: [cityAliases.cityId],
    references: [cities.id],
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
  qualityIssues: many(dataQualityIssues),
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
