import type { Context } from "hono";
import { StationService, defaultStationService } from "../services/station.service";
import {
  nearbyStationsQuerySchema,
  stationSlugParamSchema,
  stationsQuerySchema,
} from "../validators/station.validator";
import { validateParams, validateQuery } from "../middleware/validator";

export class StationController {
  constructor(private readonly stationService: StationService = defaultStationService) {}

  listStations = async (c: Context) => {
    const query = validateQuery(stationsQuerySchema, c);
    const result = await this.stationService.listStations(query);
    return c.json({ data: result }, 200);
  };

  getNearby = async (c: Context) => {
    const query = validateQuery(nearbyStationsQuerySchema, c);
    const result = await this.stationService.findNearbyStations(query);
    return c.json({ data: result }, 200);
  };

  getStation = async (c: Context) => {
    const params = validateParams(stationSlugParamSchema, c);
    const station = await this.stationService.getStation(params.slug);
    return c.json({ data: { station, phase: 1 } }, 200);
  };
}

export const defaultStationController = new StationController();
