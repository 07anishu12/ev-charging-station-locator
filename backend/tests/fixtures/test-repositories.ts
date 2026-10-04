import type { IStationRepository, StationListFilter, StationNearbyFilter } from "../../src/repositories/station.repository";
import type { ICityRepository } from "../../src/repositories/city.repository";
import type { IPincodeRepository } from "../../src/repositories/pincode.repository";
import type { ISearchRepository, SearchEntity } from "../../src/repositories/search.repository";
import type { StationModel, NearbyStationModel, CityModel, PincodeModel, PaginatedResult } from "../../src/domain/models";
import { distanceInKilometers, resolveCanonicalCity } from "@fastcharger/shared";

export const FIXTURE_STATIONS: StationModel[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    ocmId: 1001,
    slug: "tata-connaught-place-delhi",
    name: "Tata Power Fast Charger CP",
    operator: { id: "op-1", name: "Tata Power EZ Charge", slug: "tata-power" },
    address: "Block A, Connaught Place, New Delhi",
    city: { name: "Delhi", slug: "delhi" },
    state: { name: "Delhi", slug: "delhi", code: "DL" },
    district: "New Delhi",
    pincode: "110001",
    latitude: 28.6328,
    longitude: 77.2197,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/1001",
    lastUpdated: new Date().toISOString(),
    fastestPowerKw: 60,
    connectors: [
      {
        id: "c-1",
        type: "CCS (Type 2)",
        normalizedType: "ccs2",
        powerKw: 60,
        status: "available",
        quantity: 2,
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    ocmId: 1002,
    slug: "jio-bp-aerocity-delhi",
    name: "Jio-bp Pulse Aerocity",
    operator: { id: "op-2", name: "Jio-bp pulse", slug: "jio-bp" },
    address: "Asset 5, Aerocity, New Delhi",
    city: { name: "Delhi", slug: "delhi" },
    state: { name: "Delhi", slug: "delhi", code: "DL" },
    district: "South West Delhi",
    pincode: "110037",
    latitude: 28.5524,
    longitude: 77.1215,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/1002",
    lastUpdated: new Date().toISOString(),
    fastestPowerKw: 120,
    connectors: [
      {
        id: "c-2",
        type: "CCS (Type 2)",
        normalizedType: "ccs2",
        powerKw: 120,
        status: "available",
        quantity: 4,
      },
    ],
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    ocmId: 1003,
    slug: "ather-grid-indiranagar-bangalore",
    name: "Ather Grid Indiranagar",
    operator: { id: "op-3", name: "Ather Grid", slug: "ather" },
    address: "100 Feet Rd, Indiranagar, Bengaluru",
    city: { name: "Bengaluru", slug: "bengaluru" },
    state: { name: "Karnataka", slug: "karnataka", code: "KA" },
    district: "Bengaluru Urban",
    pincode: "560038",
    latitude: 12.9784,
    longitude: 77.6408,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/1003",
    lastUpdated: new Date().toISOString(),
    fastestPowerKw: 22,
    connectors: [
      {
        id: "c-3",
        type: "Type 2",
        normalizedType: "type2",
        powerKw: 22,
        status: "available",
        quantity: 2,
      },
    ],
  },
];

export const FIXTURE_CITIES: CityModel[] = [
  {
    id: "city-delhi",
    name: "Delhi",
    slug: "delhi",
    latitude: 28.6139,
    longitude: 77.209,
    stationCount: 2,
    stateName: "Delhi",
  },
  {
    id: "city-bengaluru",
    name: "Bengaluru",
    slug: "bengaluru",
    latitude: 12.9716,
    longitude: 77.5946,
    stationCount: 1,
    stateName: "Karnataka",
  },
];

export const FIXTURE_PINCODES: PincodeModel[] = [
  {
    pincode: "110001",
    district: "New Delhi",
    cityName: "Delhi",
    stateName: "Delhi",
    latitude: 28.6289,
    longitude: 77.2185,
  },
  {
    pincode: "110037",
    district: "South West Delhi",
    cityName: "Delhi",
    stateName: "Delhi",
    latitude: 28.5524,
    longitude: 77.1215,
  },
];

export class FixtureStationRepository implements IStationRepository {
  private stations = [...FIXTURE_STATIONS];

  async findByIdOrSlug(idOrSlug: string): Promise<StationModel | null> {
    return (
      this.stations.find(
        (s) =>
          s.slug === idOrSlug ||
          s.id === idOrSlug ||
          (s.ocmId && String(s.ocmId) === idOrSlug),
      ) || null
    );
  }

  async findList(filter: StationListFilter): Promise<PaginatedResult<StationModel>> {
    let items = [...this.stations];

    if (filter.city) {
      const cityFilter = filter.city.toLowerCase();
      const canonical = resolveCanonicalCity(filter.city)?.canonicalSlug ?? cityFilter;
      items = items.filter(
        (s) =>
          s.city.slug === cityFilter ||
          s.city.slug === canonical ||
          s.district?.toLowerCase().includes(cityFilter) ||
          s.address.toLowerCase().includes(cityFilter),
      );
    }
    if (filter.operator) {
      items = items.filter((s) => s.operator.slug === filter.operator?.toLowerCase());
    }
    if (filter.status) {
      items = items.filter((s) => s.status.toLowerCase() === filter.status?.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q) ||
          s.pincode === q,
      );
    }

    const total = items.length;
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;
    const offset = (page - 1) * pageSize;
    const paged = items.slice(offset, offset + pageSize);

    return {
      items: paged,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findNearby(filter: StationNearbyFilter): Promise<PaginatedResult<NearbyStationModel>> {
    const calculated = this.stations
      .map((s) => {
        const dist = distanceInKilometers(
          { latitude: filter.latitude, longitude: filter.longitude },
          { latitude: s.latitude, longitude: s.longitude },
        );
        return {
          ...s,
          distanceKm: Math.round(dist * 10) / 10,
        };
      })
      .filter((s) => s.distanceKm <= filter.radiusKm);

    // Sort strictly by distance
    calculated.sort((a, b) => a.distanceKm - b.distanceKm);

    const total = calculated.length;
    const offset = (filter.page - 1) * filter.pageSize;
    const paged = calculated.slice(offset, offset + filter.pageSize);

    return {
      items: paged,
      pagination: {
        page: filter.page,
        pageSize: filter.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filter.pageSize)),
      },
    };
  }
}

export class FixtureCityRepository implements ICityRepository {
  private cities = [...FIXTURE_CITIES];

  async findAll(page: number, pageSize: number): Promise<PaginatedResult<CityModel>> {
    const offset = (page - 1) * pageSize;
    return {
      items: this.cities.slice(offset, offset + pageSize),
      pagination: {
        page,
        pageSize,
        total: this.cities.length,
        totalPages: Math.max(1, Math.ceil(this.cities.length / pageSize)),
      },
    };
  }

  async findBySlug(slug: string): Promise<CityModel | null> {
    const direct = this.cities.find((c) => c.slug === slug.toLowerCase());
    if (direct) return direct;
    const resolved = resolveCanonicalCity(slug);
    if (resolved) {
      return this.cities.find((c) => c.slug === resolved.canonicalSlug) || null;
    }
    return null;
  }
}

export class FixturePincodeRepository implements IPincodeRepository {
  private pincodes = [...FIXTURE_PINCODES];

  async findByCode(pincode: string): Promise<PincodeModel | null> {
    return this.pincodes.find((p) => p.pincode === pincode) || null;
  }

  async findNearbyPincodes(lat: number, lng: number, radiusKm: number, limit = 10) {
    const list = this.pincodes
      .filter((p) => p.latitude !== null && p.longitude !== null)
      .map((p) => ({
        pincode: p.pincode,
        distanceKm:
          Math.round(
            distanceInKilometers(
              { latitude: lat, longitude: lng },
              { latitude: p.latitude!, longitude: p.longitude! },
            ) * 10,
          ) / 10,
      }))
      .filter((p) => p.distanceKm <= radiusKm);

    list.sort((a, b) => a.distanceKm - b.distanceKm);
    return list.slice(0, limit);
  }
}

export class FixtureSearchRepository implements ISearchRepository {
  async searchEntities(query: string, limit = 20): Promise<SearchEntity[]> {
    const q = query.toLowerCase();
    const results: SearchEntity[] = [];

    for (const c of FIXTURE_CITIES) {
      if (c.name.toLowerCase().includes(q) || c.slug.includes(q)) {
        results.push({
          id: `city-${c.slug}`,
          title: c.name,
          subtitle: `City • ${c.stationCount} stations`,
          type: "city",
          url: `/cities/${c.slug}`,
        });
      }
    }

    for (const s of FIXTURE_STATIONS) {
      if (s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)) {
        results.push({
          id: `station-${s.slug}`,
          title: s.name,
          subtitle: s.address,
          type: "station",
          url: `/stations/${s.slug}`,
        });
      }
    }

    return results.slice(0, limit);
  }
}
