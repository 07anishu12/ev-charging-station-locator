import { z } from "zod";
import { latitudeSchema, longitudeSchema, powerKwSchema } from "./common";
import { paginationMetaSchema, paginationQuerySchema } from "./pagination";

import { CONNECTOR_TYPES, type ConnectorType } from "../constants";

// Universal Enumerations
export const chargerStatusSchema = z.enum(["available", "busy", "unavailable", "unknown"]);
export const stationOperationalStatusSchema = z.enum(["Operational", "Not Operational", "Unknown"]);
export const connectorTypeSchema = z.enum(CONNECTOR_TYPES);

// Connector Schema
export const stationConnectorSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  normalizedType: connectorTypeSchema.optional(),
  powerKw: powerKwSchema.optional(),
  voltage: z.number().positive().optional(),
  amps: z.number().positive().optional(),
  status: chargerStatusSchema.or(stationOperationalStatusSchema).or(z.string()),
  quantity: z.number().int().positive().optional(),
  availability:z.enum(["AVAILABLE","PARTIALLY_AVAILABLE","UNAVAILABLE","UNKNOWN","STALE"]).optional(),
  statusSource:z.string().nullable().optional(),statusObservedAt:z.string().nullable().optional(),statusFreshness:z.string().optional(),
});

// Operator Schema
export const stationOperatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  website: z.string().url().or(z.string()).nullable().optional(),
});

// Station Summary (compact view for cards, lists, search results)
export const stationSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  address: z.string().nullable(),
  status: stationOperationalStatusSchema.or(chargerStatusSchema),
  operationalStatus: z.enum(["OPERATIONAL","NON_OPERATIONAL","TEMPORARILY_UNAVAILABLE","UNKNOWN","DECOMMISSIONED"]).or(chargerStatusSchema).optional(),
  availability:z.enum(["AVAILABLE","PARTIALLY_AVAILABLE","UNAVAILABLE","UNKNOWN","STALE"]).optional(),
  statusSource:z.string().nullable().optional(),
  statusObservedAt:z.string().nullable().optional(),
  statusFreshness:z.enum(["LIVE","RECENT","STATIC","STALE","UNKNOWN"]).optional(),
  availabilitySource:z.string().nullable().optional(),
  availabilityObservedAt:z.string().nullable().optional(),
  availabilityFreshness:z.enum(["LIVE","RECENT","STATIC","STALE","UNKNOWN"]).optional(),
  manualOverride:z.boolean().optional(),
  provenance:z.array(z.object({provider:z.string(),sourceUrl:z.string().nullable(),lastSeenAt:z.string().nullable(),sourceUpdatedAt:z.string().nullable()})).optional(),
  connectors: z.array(stationConnectorSchema),
  fastestPowerKw: powerKwSchema.optional(),
  distanceKm: z.number().nonnegative().optional(),
  distanceMeters: z.number().nonnegative().optional(),
  operator: stationOperatorSchema.optional(),
  city: z.object({ name: z.string(), slug: z.string() }).optional(),
  state: z.object({ name: z.string(), slug: z.string(), code: z.string() }).optional(),
  pincode: z.string().optional(),
});

// Map Station (optimized payload for Map rendering)
export const mapStationSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  status: chargerStatusSchema,
  fastestPowerKw: powerKwSchema,
  connectorTypes: z.array(z.string()),
  distanceKm: z.number().nonnegative().optional(),
});

// Station Detail (full comprehensive detail page view)
export const stationDetailSchema = stationSummarySchema.extend({
  ocmId: z.number().int().nullable().optional(),
  operator: stationOperatorSchema,
  address: z.string(),
  city: z.object({ name: z.string(), slug: z.string() }),
  state: z.object({ name: z.string(), slug: z.string(), code: z.string() }),
  district: z.string().nullable().optional().default(""),
  pincode: z.string(),
  status: stationOperationalStatusSchema.or(chargerStatusSchema),
  operationalStatus: z.enum(["OPERATIONAL","NON_OPERATIONAL","TEMPORARILY_UNAVAILABLE","UNKNOWN","DECOMMISSIONED"]).or(chargerStatusSchema).optional(),
  availability:z.enum(["AVAILABLE","PARTIALLY_AVAILABLE","UNAVAILABLE","UNKNOWN","STALE"]).optional(),
  statusSource:z.string().nullable().optional(),
  statusObservedAt:z.string().nullable().optional(),
  statusFreshness:z.enum(["LIVE","RECENT","STATIC","STALE","UNKNOWN"]).optional(),
  availabilitySource:z.string().nullable().optional(),
  availabilityObservedAt:z.string().nullable().optional(),
  availabilityFreshness:z.enum(["LIVE","RECENT","STATIC","STALE","UNKNOWN"]).optional(),
  manualOverride:z.boolean().optional(),
  provenance:z.array(z.object({provider:z.string(),sourceUrl:z.string().nullable(),lastSeenAt:z.string().nullable(),sourceUpdatedAt:z.string().nullable()})).optional(),
  usageType: z.string().nullable().optional().default("Public"),
  dataProvider: z.string(),
  dataLicense: z.string().nullable().optional().default(""),
  ocmUrl: z.string().nullable().optional().default(""),
  lastUpdated: z.string(),
  connectors: z.array(stationConnectorSchema),
  fastestPowerKw: powerKwSchema,
  matchType: z.enum(["exact_pincode", "nearby_pincode", "same_city", "radius"]).optional(),
  stationPincode: z.string().nullable().optional(),
  stationCity: z.string().optional(),
  stationState: z.string().optional(),
});

// Request Schemas
export const stationSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Station identifier is required.")
    .max(1024, "Station identifier is too long.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Station slug must contain only alphanumeric characters, dashes, or underscores."),
});
export const stationSlugSchema = stationSlugParamSchema;
export const stationIdSchema = z.object({ id: z.string().trim().min(1).max(120) });

export const stationsQuerySchema = paginationQuerySchema.extend({
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  operator: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  connectorType: z.string().trim().min(1).optional(),
  minPowerKw: powerKwSchema.optional(),
  search: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
});

export const nearbyStationsQueryObjectSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  radiusKm: z.coerce
    .number({ message: "Radius must be a valid number." })
    .positive("Radius must be greater than 0.")
    .max(500, "Radius cannot exceed 500 km.")
    .default(10),
  radius: z.coerce.number().positive().max(500).optional(),
  connectorType: z.string().trim().min(1).optional(),
  operator: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  minPowerKw: powerKwSchema.optional(),
  sortBy: z.enum(["distance", "power", "name", "updatedAt"]).default("distance"),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: paginationQuerySchema.shape.page,
  pageSize: paginationQuerySchema.shape.pageSize,
});

export const nearbyStationsQuerySchema = z.preprocess(
  (arg: unknown) => {
    if (arg && typeof arg === "object") {
      const copy = { ...(arg as Record<string, unknown>) };
      if (copy.radius !== undefined && copy.radiusKm === undefined) {
        copy.radiusKm = copy.radius;
      }
      if (copy.sort !== undefined && copy.sortBy === undefined) {
        copy.sortBy = copy.sort;
      }
      return copy;
    }
    return arg;
  },
  nearbyStationsQueryObjectSchema,
);

// Response Schemas
export const stationSearchResultSchema = z.object({
  items: z.array(stationSummarySchema),
  pagination: paginationMetaSchema,
});

export const stationDetailResponseDataSchema = z.object({
  station: stationDetailSchema.nullable(),
  phase: z.number().int().optional(),
});

// Inferred Types
export type ChargerStatus = z.infer<typeof chargerStatusSchema>;
export type StationOperationalStatus = z.infer<typeof stationOperationalStatusSchema>;
export type { ConnectorType };
export type StationConnector = z.infer<typeof stationConnectorSchema>;
export type StationOperator = z.infer<typeof stationOperatorSchema>;
export type StationSummary = z.infer<typeof stationSummarySchema>;
export type MapStation = z.infer<typeof mapStationSchema>;
export type StationDetail = z.infer<typeof stationDetailSchema>;
export type Station = StationDetail;
export type StationSlugParams = z.infer<typeof stationSlugParamSchema>;
export type StationsQuery = z.infer<typeof stationsQuerySchema>;
export type StationsQueryInput = z.input<typeof stationsQuerySchema>;
export type NearbyStationsQuery = z.infer<typeof nearbyStationsQueryObjectSchema>;
export type NearbyStationsQueryInput = z.input<typeof nearbyStationsQueryObjectSchema>;
export type StationSearchResult = z.infer<typeof stationSearchResultSchema>;
export type StationDetailResponseData = z.infer<typeof stationDetailResponseDataSchema>;
