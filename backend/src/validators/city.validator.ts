import { z } from "zod";

export const citySlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "City slug is required.")
    .max(100, "City slug is too long.")
    .regex(/^[a-z0-9-]+$/, "City slug must contain only lowercase alphanumeric characters and dashes."),
});

export const citiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const cityStationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  minPowerKw: z.coerce.number().nonnegative().optional(),
  connectorType: z.string().trim().min(1).optional(),
});

export type CitySlugParams = z.infer<typeof citySlugParamSchema>;
export type CitiesQuery = z.infer<typeof citiesQuerySchema>;
export type CityStationsQuery = z.infer<typeof cityStationsQuerySchema>;
