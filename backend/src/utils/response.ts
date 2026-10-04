import type { ZodError } from "zod";

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function apiSuccess<T>(data: T, status = 200): Response {
  return jsonResponse({ data }, status);
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  return jsonResponse(
    {
      error: { code, message, ...(details === undefined ? {} : { details }) },
    },
    status,
  );
}

export function validationError(error: ZodError): Response {
  return apiError("VALIDATION_ERROR", "The request parameters are invalid.", 400, error.issues);
}
