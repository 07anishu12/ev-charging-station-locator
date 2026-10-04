import type { Context } from "hono";
import { ZodError } from "zod";
import { DomainError } from "../domain/errors";
import { logger } from "../infrastructure/logger";

function sanitizeErrorMessage(message: string): string {
  // Completely mask database/SQL execution errors and connection failures
  if (
    /Failed query|syntax error|relation .* does not exist|column .* does not exist|connect ECONNREFUSED|connect ETIMEDOUT|password authentication failed|connection to .* failed|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from/i.test(
      message,
    )
  ) {
    return "Database operation failed or service is currently unreachable.";
  }

  // Strip connection strings, SQL statements, and secrets
  return message
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***$3")
    .replace(/(apiKey|token|secret|password|authorization)=([^\s&]+)/gi, "$1=***");
}

export function errorHandler(err: Error, c: Context) {
  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    logger.warn(`Validation Error on ${c.req.path}`, { issues: err.issues });
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "The request parameters are invalid.",
          details: err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
      },
      400,
    );
  }

  // 2. Explicit Domain Error (e.g. NotFound, ValidationError, DatabaseUnavailable)
  if (err instanceof DomainError) {
    logger.warn(`Domain Error [${err.code}] on ${c.req.path}: ${err.message}`);
    const statusCode = (err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500) as 400 | 404 | 413 | 429 | 500 | 503;
    return c.json(
      {
        error: {
          code: err.code,
          message: sanitizeErrorMessage(err.message),
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      statusCode,
    );
  }

  // 3. Unhandled Server Error
  logger.error(`Unhandled Exception on ${c.req.path}: ${err.message}`, {
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  // Never leak SQL errors or connection strings
  const isProd = process.env.NODE_ENV === "production";
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: isProd
          ? "An unexpected error occurred. Please try again later."
          : sanitizeErrorMessage(err.message),
      },
    },
    500,
  );
}
