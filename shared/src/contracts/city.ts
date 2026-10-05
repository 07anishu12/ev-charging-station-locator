import { z } from "zod";
import { latitudeSchema, longitudeSchema, powerKwSchema } from "./common";
import { paginationMetaSchema, paginationQuerySchema } from "./pagination";
import { stationDetailSchema } from "./station";

export const citySlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "City slug is required.")
    .max(100, "City slug is too long.")
    .regex(/^[a-z0-9-]+$/, "City slug must contain only lowercase alphanumeric characters and dashes."),
});
export const citySlugSchema = citySlugParamSchema;

export const citySummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  stateName: z.string().min(1),
  stateSlug: z.string().min(1).default("india"),
  stationCount: z.number().int().nonnegative(),
  fastChargerCount: z.number().int().nonnegative().default(0),
  networkCount: z.number().int().nonnegative().optional(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  popularPincodes: z.array(z.string()).default([]),
});

export const cityOperatorSummarySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  stationCount: z.number().int().nonnegative(),
});

export const cityStatisticsSchema = z.object({
  citySlug: z.string(),
  cityName: z.string(),
  stateSlug: z.string().optional(),
  stateName: z.string().optional(),
  stationCount: z.number().int().nonnegative(),
  networkCount: z.number().int().nonnegative(),
  fastChargerCount: z.number().int().nonnegative(),
  totalConnectors: z.number().int().nonnegative().optional(),
});

export const cityStatisticsResponseDataSchema = cityStatisticsSchema;

export const citiesQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const cityStationsQuerySchema = z.object({
  page: paginationQuerySchema.shape.page,
  pageSize: paginationQuerySchema.shape.pageSize,
  limit: z.coerce.number().int().min(1).max(100).optional(),
  minPowerKw: powerKwSchema.optional(),
  connectorType: z.string().trim().min(1).optional(),
});

export const cityStationsResponseDataSchema = z.object({
  city: citySummarySchema,
  operators: z.array(cityOperatorSummarySchema).optional(),
  stations: z.array(stationDetailSchema),
  pagination: paginationMetaSchema,
});

export type CitySlugParams = z.infer<typeof citySlugParamSchema>;
export type CitySummary = z.infer<typeof citySummarySchema>;
export type CityOperatorSummary = z.infer<typeof cityOperatorSummarySchema>;
export type CityStatistics = z.infer<typeof cityStatisticsSchema>;
export type CityStatisticsResponseData = z.infer<typeof cityStatisticsResponseDataSchema>;
export type CitiesQuery = z.infer<typeof citiesQuerySchema>;
export type CitiesQueryInput = z.input<typeof citiesQuerySchema>;
export type CityStationsQuery = z.infer<typeof cityStationsQuerySchema>;
export type CityStationsQueryInput = z.input<typeof cityStationsQuerySchema>;
export type CityStationsResponseData = z.infer<typeof cityStationsResponseDataSchema>;
