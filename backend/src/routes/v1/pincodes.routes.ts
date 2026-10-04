import { Hono } from "hono";
import { PincodeController, defaultPincodeController } from "../../controllers/pincode.controller";

export function createPincodesRouter(controller: PincodeController = defaultPincodeController) {
  const router = new Hono();

  router.get("/:pincode", controller.getPincode);

  return router;
}

export const pincodesRouter = createPincodesRouter();
