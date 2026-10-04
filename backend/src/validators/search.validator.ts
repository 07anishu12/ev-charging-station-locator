import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query 'q' cannot be empty.")
    .max(200, "Search query is too long."),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  radiusKm: z.coerce.number().positive().max(100).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
