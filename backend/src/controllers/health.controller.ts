import type { Context } from "hono";
import { checkDbConnection } from "../infrastructure/database";

export class HealthController {
  getHealth = async (c: Context) => {
    return c.json(
      {
        data: {
          status: "ok",
          service: "fastcharger-api",
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      },
      200,
    );
  };

  getDbHealth = async (c: Context) => {
    const health = await checkDbConnection();
    if (!health.ok) {
      return c.json(
        {
          error: {
            code: "DATABASE_UNHEALTHY",
            message: "Database health check failed.",
            details: { ok: false, message: health.message },
          },
        },
        503,
      );
    }
    return c.json(
      {
        data: {
          status: "ok",
          database: {
            ok: true,
            timestamp: new Date().toISOString(),
          },
        },
      },
      200,
    );
  };
}

export const defaultHealthController = new HealthController();
