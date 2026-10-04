import { Hono } from "hono";
import { SearchController, defaultSearchController } from "../../controllers/search.controller";

export function createSearchRouter(controller: SearchController = defaultSearchController) {
  const router = new Hono();

  router.get("/", controller.search);

  return router;
}

export const searchRouter = createSearchRouter();
