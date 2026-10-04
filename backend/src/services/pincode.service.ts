import { PincodeNotFoundError } from "../domain/errors";
import { lookupCanonicalPincode } from "@fastcharger/shared";
import { DrizzlePincodeRepository, type IPincodeRepository } from "../repositories/pincode.repository";
import { PostgisStationRepository, type IStationRepository } from "../repositories/station.repository";

export class PincodeService {
  constructor(
    private readonly pincodeRepo: IPincodeRepository = new DrizzlePincodeRepository(),
    private readonly stationRepo: IStationRepository = new PostgisStationRepository(),
  ) {}

  async getPincodeStationData(
    pincode: string,
    options: {
      page: number;
      limit: number;
      radiusKm: number;
    },
  ) {
    const cleanPin = pincode.trim();

    // 1. Check DB first
    const dbPincode = await this.pincodeRepo.findByCode(cleanPin);

    // 2. Check canonical static metadata if DB row not found
    const staticPin = lookupCanonicalPincode(cleanPin);

    if (!dbPincode && !staticPin) {
      throw new PincodeNotFoundError(cleanPin);
    }

    const latitude = dbPincode?.latitude ?? staticPin?.latitude ?? null;
    const longitude = dbPincode?.longitude ?? staticPin?.longitude ?? null;
    const cityName = dbPincode?.cityName ?? staticPin?.cityName ?? null;
    const district = dbPincode?.district ?? staticPin?.district ?? null;

    let stations = [];
    let nearbyPincodes: Array<{ pincode: string; distanceKm: number }> = [];

    if (latitude !== null && longitude !== null) {
      // PostGIS spatial nearby query
      const nearbyResult = await this.stationRepo.findNearby({
        latitude,
        longitude,
        radiusKm: options.radiusKm,
        page: options.page,
        pageSize: options.limit,
      });

      stations = nearbyResult.items;

      // Nearby pincodes
      nearbyPincodes = await this.pincodeRepo.findNearbyPincodes(
        latitude,
        longitude,
        options.radiusKm,
        10,
      );
    } else {
      // Fallback to exact pincode text match
      const exactResult = await this.stationRepo.findList({
        search: cleanPin,
        page: options.page,
        pageSize: options.limit,
      });
      stations = exactResult.items.map((s) => ({ ...s, distanceKm: 0 }));
    }

    return {
      pincode: cleanPin,
      location: latitude && longitude ? { latitude, longitude, city: cityName, district } : null,
      stations,
      total: stations.length,
      exactPincodeCount: stations.filter((s) => s.pincode === cleanPin).length,
      nearbyPincodeCount: stations.filter((s) => s.pincode !== cleanPin).length,
      radiusCount: stations.length,
      nearbyPincodes,
      radiusKm: options.radiusKm,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: stations.length,
        totalPages: Math.max(1, Math.ceil(stations.length / options.limit)),
      },
    };
  }
}

export const defaultPincodeService = new PincodeService();
