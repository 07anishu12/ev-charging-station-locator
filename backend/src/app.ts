import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { errorHandler } from "./middleware/error-handler";
import { createRateLimiter } from "./middleware/rate-limiter";
import { v1Router } from "./routes/v1";
import { healthRouter } from "./routes/health.routes";

export function createApp() {
  const app = new Hono();

  // 1. Security Headers
  app.use("*", secureHeaders());

  // 2. CORS
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
      maxAge: 86400,
    }),
  );

  // 3. Request Size Limit (1MB)
  app.use(
    "*",
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) => {
        return c.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request payload exceeds the maximum allowed size of 1MB.",
            },
          },
          413,
        );
      },
    }),
  );

  // 4. Rate Limiter (120 req / minute per client)
  app.use("/api/*", createRateLimiter({ windowMs: 60 * 1000, maxRequests: 120 }));

  // 5. Health Routes
  app.route("/health", healthRouter);

  // 6. API v1 Routes
  app.route("/api/v1", v1Router);

  // 7. Not Found Handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Endpoint ${c.req.method} ${c.req.path} does not exist.`,
        },
      },
      404,
    );
  });

  // 8. Centralized Error Handler
  app.onError(errorHandler);

  return app;
}

export const app = createApp();
