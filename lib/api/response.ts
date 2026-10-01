import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, ...(details === undefined ? {} : { details }) },
    },
    { status },
  );
}

export function validationError(error: ZodError): NextResponse {
  return apiError("VALIDATION_ERROR", "The request parameters are invalid.", 400, error.issues);
}
