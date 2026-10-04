import {
  FastChargerApiClient,
  FastChargerApiError,
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

export interface ApiSuccessResponse<T> {
  status: "success";
  items: T[];
  pagination: Pagination;
  error?: never;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export interface ApiFailureResponse {
  status: "error";
  error: ApiErrorDetail;
  items: [];
  pagination: Pagination;
}

export type PaginatedResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

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

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  // In production browser runtime, missing NEXT_PUBLIC_API_URL is an explicit configuration defect
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    throw new Error(
      "Configuration Error: NEXT_PUBLIC_API_URL is required in production environment but was not defined.",
    );
  }
  if (typeof window === "undefined") {
    return process.env.API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  }
  return "http://localhost:4000";
}

class FrontendApiClient {
  private get client(): FastChargerApiClient {
    return new FastChargerApiClient({
      baseUrl: getBaseUrl(),
      validateResponses: true,
    });
  }

  private normalizeError(err: unknown): ApiErrorDetail {
    if (err instanceof FastChargerApiError) {
      return {
        code: err.code,
        message: err.message,
        status: err.status,
        details: err.details,
      };
    }
    if (err instanceof Error) {
      return {
        code: "CLIENT_ERROR",
        message: err.message,
        status: 0,
      };
    }
    return {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred while communicating with the API.",
      status: 0,
    };
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
      return {
        status: "success",
        items: res.items as unknown as Station[],
        pagination: res.pagination,
      };
    } catch (err) {
      const error = this.normalizeError(err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ApiClient] getStations failed:", error.message);
      }
      return {
        status: "error",
        error,
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
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
      return {
        status: "success",
        items: res.items as unknown as Array<Station & { distanceKm: number }>,
        pagination: res.pagination,
      };
    } catch (err) {
      const error = this.normalizeError(err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ApiClient] getNearbyStations failed:", error.message);
      }
      return {
        status: "error",
        error,
        items: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
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
      return {
        status: "success",
        items: res.items as unknown as City[],
        pagination: res.pagination,
      };
    } catch (err) {
      const error = this.normalizeError(err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ApiClient] getCities failed:", error.message);
      }
      return {
        status: "error",
        error,
        items: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
      };
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
