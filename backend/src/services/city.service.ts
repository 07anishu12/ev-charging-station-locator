import { CityNotFoundError } from "../domain/errors";
import type { CityModel, CityStatisticsModel, PaginatedResult } from "../domain/models";
import { DrizzleCityRepository, type ICityRepository } from "../repositories/city.repository";

export class CityService {
  constructor(private readonly cityRepo: ICityRepository = new DrizzleCityRepository()) {}

  async listCities(options: { page: number; pageSize: number }): Promise<PaginatedResult<CityModel>> {
    return this.cityRepo.findAll(options.page, options.pageSize);
  }

  async getCityBySlug(slug: string): Promise<CityModel> {
    const city = await this.cityRepo.findBySlug(slug);
    if (!city) {
      throw new CityNotFoundError(slug);
    }
    return city;
  }

  async getCityStatistics(slug: string): Promise<CityStatisticsModel> {
    const stats = await this.cityRepo.getStatistics(slug);
    if (!stats) {
      throw new CityNotFoundError(slug);
    }
    return stats;
  }
}

export const defaultCityService = new CityService();
