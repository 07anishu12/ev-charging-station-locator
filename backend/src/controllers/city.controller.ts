import type { Context } from "hono";
import { CityService, defaultCityService } from "../services/city.service";
import { StationService, defaultStationService } from "../services/station.service";
import {
  citiesQuerySchema,
  citySlugParamSchema,
  cityStationsQuerySchema,
} from "../validators/city.validator";
import { validateParams, validateQuery } from "../middleware/validator";

export class CityController {
  constructor(
    private readonly cityService: CityService = defaultCityService,
    private readonly stationService: StationService = defaultStationService,
  ) {}

  listCities = async (c: Context) => {
    const query = validateQuery(citiesQuerySchema, c);
    const result = await this.cityService.listCities(query);
    return c.json({ data: result }, 200);
  };

  getCity = async (c: Context) => {
    const params = validateParams(citySlugParamSchema, c);
    const query = validateQuery(cityStationsQuerySchema, c);

    const result = await this.stationService.getCityStationData(params.slug, query);
    return c.json(
      {
        data: {
          city: result.city,
          stations: result.items,
          pagination: result.pagination,
        },
      },
      200,
    );
  };
}

export const defaultCityController = new CityController();
