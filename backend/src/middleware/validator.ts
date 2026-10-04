import type { Context } from "hono";
import type { ZodSchema } from "zod";

export function validateQuery<T>(schema: ZodSchema<T>, c: Context): T {
  const query = c.req.query();
  return schema.parse(query);
}

export function validateParams<T>(schema: ZodSchema<T>, c: Context): T {
  const params = c.req.param();
  return schema.parse(params);
}
