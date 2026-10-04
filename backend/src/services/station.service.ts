import { StationNotFoundError, CityNotFoundError } from "../domain/errors";
import type {
  StationModel,
  NearbyStationModel,
  PaginatedResult,
} from "../domain/models";
import {
  PostgisStationRepository,
  type IStationRepository,
  type StationListFilter,
  type StationNearbyFilter,
} from "../repositories/station.repository";
import { DrizzleCityRepository, type ICityRepository } from "../repositories/city.repository";

export class StationService {
  constructor(
    private readonly stationRepo: IStationRepository = new PostgisStationRepository(),
    private readonly cityRepo: ICityRepository = new DrizzleCityRepository(),
  ) {}

  async getStation(idOrSlug: string): Promise<StationModel> {
    const station = await this.stationRepo.findByIdOrSlug(idOrSlug);
    if (!station) {
      throw new StationNotFoundError(idOrSlug);
    }
    return station;
  }

  async listStations(filter: StationListFilter): Promise<PaginatedResult<StationModel>> {
    return this.stationRepo.findList(filter);
  }

  async findNearbyStations(filter: StationNearbyFilter): Promise<PaginatedResult<NearbyStationModel>> {
    return this.stationRepo.findNearby(filter);
  }

  async getCityStationData(
    citySlug: string,
    options: {
      page: number;
      pageSize: number;
      minPowerKw?: number;
      connectorType?: string;
    },
  ) {
    const city = await this.cityRepo.findBySlug(citySlug);
    if (!city) {
      throw new CityNotFoundError(citySlug);
    }

    const stationsResult = await this.stationRepo.findList({
      city: city.slug,
      page: options.page,
      pageSize: options.pageSize,
      minPowerKw: options.minPowerKw,
      connectorType: options.connectorType,
    });

    return {
      city,
      items: stationsResult.items,
      pagination: stationsResult.pagination,
    };
  }
}

export const defaultStationService = new StationService();
