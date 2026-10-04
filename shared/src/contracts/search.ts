import { z } from "zod";
import { paginationMetaSchema, paginationQuerySchema } from "./pagination";
import { pincodeLocationSchema, nearbyPincodeItemSchema } from "./pincode";
import { stationDetailSchema } from "./station";

export const searchEntityTypeSchema = z.enum(["city", "station", "operator", "pincode"]);

export const searchEntityResultSchema = z.object({
  type: searchEntityTypeSchema,
  title: z.string().min(1),
  subtitle: z.string(),
  href: z.string().min(1),
  badge: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query 'q' cannot be empty.")
    .max(200, "Search query is too long."),
  page: paginationQuerySchema.shape.page,
  pageSize: paginationQuerySchema.shape.pageSize,
  radiusKm: z.coerce.number().positive().max(100).optional(),
});

export const searchResponseDataSchema = z.object({
  searchType: z.enum(["text", "pincode"]),
  query: z.string(),
  items: z.array(searchEntityResultSchema).optional(),
  results: z.array(stationDetailSchema).optional(),
  origin: pincodeLocationSchema.optional(),
  nearbyPincodes: z.array(nearbyPincodeItemSchema).optional(),
  counts: z
    .object({
      exact: z.number().int().nonnegative(),
      nearby: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
    })
    .optional(),
  radiusKm: z.number().positive().optional(),
  pagination: paginationMetaSchema,
});

export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;
export type SearchEntityResult = z.infer<typeof searchEntityResultSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchQueryInput = z.input<typeof searchQuerySchema>;
export type SearchResponseData = z.infer<typeof searchResponseDataSchema>;
