import type { Context } from "hono";
import { PincodeService, defaultPincodeService } from "../services/pincode.service";
import { pincodeParamSchema, pincodeQuerySchema } from "../validators/pincode.validator";
import { validateParams, validateQuery } from "../middleware/validator";

export class PincodeController {
  constructor(private readonly pincodeService: PincodeService = defaultPincodeService) {}

  getPincode = async (c: Context) => {
    const params = validateParams(pincodeParamSchema, c);
    const query = validateQuery(pincodeQuerySchema, c);

    const result = await this.pincodeService.getPincodeStationData(params.pincode, {
      page: query.page,
      limit: query.pageSize,
      radiusKm: query.radiusKm,
    });

    return c.json({ data: result }, 200);
  };
}

export const defaultPincodeController = new PincodeController();
