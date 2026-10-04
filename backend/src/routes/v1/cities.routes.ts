import { Hono } from "hono";
import { CityController, defaultCityController } from "../../controllers/city.controller";

export function createCitiesRouter(controller: CityController = defaultCityController) {
  const router = new Hono();

  router.get("/", controller.listCities);
  router.get("/:slug", controller.getCity);

  return router;
}

export const citiesRouter = createCitiesRouter();
