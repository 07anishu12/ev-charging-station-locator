import { z } from "zod";
import { PAGINATION_DEFAULTS, SEARCH_DEFAULTS } from "../constants";

const pageSchema = z.coerce.number().int().min(1).default(PAGINATION_DEFAULTS.defaultPage);
const pageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(PAGINATION_DEFAULTS.maxPageSize)
  .default(PAGINATION_DEFAULTS.defaultPageSize);

export const stationsQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
  query: z.string().trim().min(1).max(120).optional(),
});

export const nearbyStationsQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce
    .number()
    .positive()
    .max(SEARCH_DEFAULTS.maxRadiusKm)
    .default(SEARCH_DEFAULTS.defaultRadiusKm),
  page: pageSchema,
  pageSize: pageSizeSchema,
});

export const stationIdSchema = z.object({ id: z.string().trim().min(1).max(120) });
export const citySlugSchema = z.object({ slug: z.string().trim().min(1).max(120) });
export const pincodeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "PIN code must contain 6 digits"),
});
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  page: pageSchema,
  pageSize: pageSizeSchema,
});

export function parseQuery<T extends z.ZodType>(schema: T, searchParams: URLSearchParams) {
  return schema.safeParse(Object.fromEntries(searchParams.entries()));
}
