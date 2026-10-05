import { statisticsRouter } from "./statistics.routes";
import { Hono } from "hono";
import { stationsRouter } from "./stations.routes";
import { citiesRouter } from "./cities.routes";
import { pincodesRouter } from "./pincodes.routes";
import { searchRouter } from "./search.routes";

export function createV1Router() {
  const router = new Hono();

  router.route("/statistics",statisticsRouter);
  router.route("/stations", stationsRouter);
  router.route("/cities", citiesRouter);
  router.route("/pincodes", pincodesRouter);
  router.route("/search", searchRouter);

  return router;
}

export const v1Router = createV1Router();
