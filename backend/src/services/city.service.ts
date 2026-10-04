import { CityNotFoundError } from "../domain/errors";
import type { CityModel, PaginatedResult } from "../domain/models";
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
}

export const defaultCityService = new CityService();
