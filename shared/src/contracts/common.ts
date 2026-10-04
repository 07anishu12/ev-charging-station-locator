import { z } from "zod";
import {
  apiErrorDetailSchema,
  apiErrorResponseSchema,
  type ApiErrorDetail,
  type ApiErrorResponse,
} from "./errors";

export {
  apiErrorDetailSchema,
  apiErrorResponseSchema,
  type ApiErrorDetail,
  type ApiErrorResponse,
};

// Universal coordinate primitives
export const latitudeSchema = z.coerce
  .number({ message: "Latitude is required and must be a valid number." })
  .min(-90, "Latitude must be between -90 and 90.")
  .max(90, "Latitude must be between -90 and 90.");

export const longitudeSchema = z.coerce
  .number({ message: "Longitude is required and must be a valid number." })
  .min(-180, "Longitude must be between -180 and 180.")
  .max(180, "Longitude must be between -180 and 180.");

export const coordinatesSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

// Standard identifier primitives
export const idSchema = z
  .string()
  .trim()
  .min(1, "Identifier cannot be empty.")
  .max(128, "Identifier is too long.");

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug cannot be empty.")
  .max(128, "Slug is too long.")
  .regex(/^[a-z0-9_-]+$/, "Slug must contain only lowercase alphanumeric characters, dashes, or underscores.");

// Unit primitives
export const powerKwSchema = z.coerce.number().nonnegative("Power in kW must be non-negative.");
export const distanceKmSchema = z.coerce.number().nonnegative("Distance in km must be non-negative.");
export const distanceMetersSchema = z.coerce.number().nonnegative("Distance in meters must be non-negative.");

// Generic Response Envelope Schemas
export function createApiSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.union([
    createApiSuccessResponseSchema(dataSchema),
    apiErrorResponseSchema,
  ]);
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | z.infer<typeof apiErrorResponseSchema>;

export function isApiErrorResponse<T>(response: ApiResponse<T>): response is z.infer<typeof apiErrorResponseSchema> {
  return typeof response === "object" && response !== null && "error" in response;
}

export type Coordinates = z.infer<typeof coordinatesSchema>;

export function parseQuery<T extends z.ZodTypeAny>(schema: T, searchParams: URLSearchParams) {
  return schema.safeParse(Object.fromEntries(searchParams.entries()));
}
