import {
  FastChargerApiClient,
  type StationDetail as Station,
  type CitySummary as City,
  type SearchEntityResult,
  type PaginationMeta as Pagination,
  type CityStationsResponseData,
  type PincodeStationResponseData,
  type NearbyPincodeItem,
} from "@fastcharger/shared";

export type {
  Station,
  City,
  SearchEntityResult,
  Pagination,
  NearbyPincodeItem,
};

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export type CityDetailResponse = CityStationsResponseData;

export interface PincodeStationItem extends Station {
  matchType?: "exact_pincode" | "nearby_pincode" | "same_city" | "radius";
  distanceKm?: number;
  distanceMeters?: number;
  stationPincode?: string | null;
  stationCity?: string;
  stationState?: string;
}

export type PincodeDetailResponse = PincodeStationResponseData;

export interface TextSearchResult {
  searchType: "text";
  query: string;
  items: SearchEntityResult[];
  categorized: {
    cities: SearchEntityResult[];
    stations: SearchEntityResult[];
    operators: SearchEntityResult[];
    pincodes: SearchEntityResult[];
  };
  resultCount: number;
  pagination: Pagination;
}

export interface PincodeSearchResultItem extends Station {
  matchType: "exact_pincode" | "nearby_pincode" | "same_city" | "radius";
  distanceKm: number;
  distanceMeters: number;
  stationPincode: string | null;
  stationCity: string;
  stationState: string;
}

export interface PincodeSearchResult {
  searchType: "pincode";
  query: string;
  pincode: string;
  origin: {
    latitude: number | null;
    longitude: number | null;
    city: string;
    citySlug: string;
    state: string;
    stateSlug: string;
    stateCode: string;
    district: string;
    hasCoordinates: boolean;
  };
  radiusKm: number;
  radiusMeters: number;
  resultCount: number;
  counts: {
    exact: number;
    nearby: number;
    total: number;
  };
  results: PincodeSearchResultItem[];
  nearbyPincodes: Array<{
    pincode: string;
    city: string;
    district: string;
    distanceKm: number;
  }>;
  pagination: Pagination;
}

export type SearchResultResponse = TextSearchResult | PincodeSearchResult;

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return process.env.API_URL?.replace(/\/$/, "") || "http://localhost:3001";
  }
  return "http://localhost:3001";
}

class FrontendApiClient {
  private get client(): FastChargerApiClient {
    return new FastChargerApiClient({
      baseUrl: getBaseUrl(),
      validateResponses: false,
    });
  }

  async getStations(params: {
    page?: number;
    pageSize?: number;
    city?: string;
    state?: string;
    operator?: string;
    status?: string;
    connectorType?: string;
    minPowerKw?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<Station>> {
    try {
      const res = await this.client.getStations(params);
      return res as unknown as PaginatedResponse<Station>;
    } catch {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    }
  }

  async getNearbyStations(params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    connectorType?: string;
    minPowerKw?: number;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Station & { distanceKm: number }>> {
    try {
      const res = await this.client.getNearbyStations(params);
      return res as unknown as PaginatedResponse<Station & { distanceKm: number }>;
    } catch {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    }
  }

  async getStation(idOrSlug: string): Promise<Station | null> {
    try {
      return (await this.client.getStation(idOrSlug)) as Station | null;
    } catch {
      return null;
    }
  }

  async getCities(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<City>> {
    try {
      const res = await this.client.getCities(params);
      return res as PaginatedResponse<City>;
    } catch {
      return { items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } };
    }
  }

  async getCity(
    slug: string,
    params: { page?: number; pageSize?: number; minPowerKw?: number; connectorType?: string } = {},
  ): Promise<CityDetailResponse | null> {
    try {
      return await this.client.getCity(slug, params);
    } catch {
      return null;
    }
  }

  async getPincode(
    pincode: string,
    params: { page?: number; pageSize?: number; radiusKm?: number } = {},
  ): Promise<PincodeDetailResponse | null> {
    try {
      return await this.client.getPincode(pincode, params);
    } catch {
      return null;
    }
  }

  async search(params: {
    q: string;
    page?: number;
    pageSize?: number;
    radiusKm?: number;
  }): Promise<SearchResultResponse | null> {
    try {
      const result = await this.client.search(params);
      return result as SearchResultResponse | null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new FrontendApiClient();
