import { Hono } from "hono";
import { StationController, defaultStationController } from "../../controllers/station.controller";

export function createStationsRouter(controller: StationController = defaultStationController) {
  const router = new Hono();

  router.get("/", controller.listStations);
  router.get("/nearby", controller.getNearby);
  router.get("/:slug", controller.getStation);

  return router;
}

export const stationsRouter = createStationsRouter();
