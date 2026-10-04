import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./config";
import { shutdownDatabase } from "./infrastructure/database";
import { logger } from "./infrastructure/logger";

export function startServer() {
  const port = env.port || 4000;
  const host = process.env.HOST || "0.0.0.0";

  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname: host,
    },
    (info) => {
      logger.info(`FastCharger Backend API listening on http://${info.address}:${info.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    },
  );

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await shutdownDatabase();
        logger.info("Database connections closed.");
      } catch (err) {
        logger.error("Error closing database connections", { error: String(err) });
      }
      logger.info("Server closed successfully.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Shutdown timed out, forcefully exiting.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

if (process.env.NODE_ENV !== "test" && require.main === module) {
  startServer();
}
