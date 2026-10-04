import { Hono } from "hono";
import { HealthController, defaultHealthController } from "../controllers/health.controller";

export function createHealthRouter(controller: HealthController = defaultHealthController) {
  const router = new Hono();

  router.get("/", controller.getHealth);
  router.get("/db", controller.getDbHealth);

  return router;
}

export const healthRouter = createHealthRouter();
