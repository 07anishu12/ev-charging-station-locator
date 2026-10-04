import { z } from "zod";

export const API_ERROR_CODES = [
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "NOT_FOUND",
  "STATION_NOT_FOUND",
  "CITY_NOT_FOUND",
  "PINCODE_NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMIT_EXCEEDED",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number] | (string & {});

export const apiErrorDetailSchema = z.object({
  code: z.string().min(1, "Error code is required."),
  message: z.string().min(1, "Error message is required."),
  details: z.unknown().optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorDetailSchema,
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

// Deterministic HTTP Status Code mappings
export const HTTP_STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: 400,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  STATION_NOT_FOUND: 404,
  CITY_NOT_FOUND: 404,
  PINCODE_NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
