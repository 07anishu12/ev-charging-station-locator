import { z } from "zod";

export const stationSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Station identifier is required.")
    .max(128, "Station identifier is too long.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Station slug must contain only alphanumeric characters, dashes, or underscores."),
});

export const stationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  city: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1).optional(),
  operator: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  connectorType: z.string().trim().min(1).optional(),
  minPowerKw: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().min(1).optional(),
});

export const nearbyStationsQuerySchema = z.object({
  latitude: z.coerce
    .number({ message: "Latitude is required and must be a valid number." })
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
  longitude: z.coerce
    .number({ message: "Longitude is required and must be a valid number." })
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
  radiusKm: z.coerce
    .number()
    .positive("Radius must be greater than 0.")
    .max(500, "Radius cannot exceed 500 km.")
    .default(10),
  connectorType: z.string().trim().min(1).optional(),
  minPowerKw: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type StationSlugParams = z.infer<typeof stationSlugParamSchema>;
export type StationsQuery = z.infer<typeof stationsQuerySchema>;
export type NearbyStationsQuery = z.infer<typeof nearbyStationsQuerySchema>;
