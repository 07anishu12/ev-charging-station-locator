import { z } from "zod";
import { PAGINATION_DEFAULTS } from "../constants";

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer.")
    .positive("Page must be greater than zero.")
    .default(PAGINATION_DEFAULTS.defaultPage),
  pageSize: z.coerce
    .number()
    .int("Page size must be an integer.")
    .min(1, "Page size must be at least 1.")
    .max(PAGINATION_DEFAULTS.maxPageSize, `Page size cannot exceed ${PAGINATION_DEFAULTS.maxPageSize}.`)
    .default(PAGINATION_DEFAULTS.defaultPageSize),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
});

export function createPaginatedResultSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: paginationMetaSchema,
  });
}

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMeta;
};
