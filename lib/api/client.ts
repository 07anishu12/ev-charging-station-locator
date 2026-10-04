import type { Station, City, SearchEntityResult } from "@fastcharger/shared";

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface CityDetailResponse {
  city: City;
  stations: Station[];
  pagination: Pagination;
}

export type NearbyPincodeItem = {
  pincode: string;
  city?: string;
  district?: string;
  distanceKm: number;
};

export interface PincodeStationItem extends Station {
  matchType?: "exact_pincode" | "nearby_pincode" | "same_city" | "radius";
  distanceKm: number;
  distanceMeters?: number;
  stationPincode?: string | null;
  stationCity?: string;
  stationState?: string;
}

export interface PincodeDetailResponse {
  pincode: string;
  location: {
    latitude: number;
    longitude: number;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    citySlug?: string;
    stateSlug?: string;
    stateCode?: string;
    hasCoordinates?: boolean;
  } | null;
  stations: PincodeStationItem[];
  total: number;
  exactPincodeCount: number;
  nearbyPincodeCount: number;
  radiusCount: number;
  nearbyPincodes: NearbyPincodeItem[];
  radiusKm: number;
  pagination: Pagination;
}

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
    return process.env.API_URL?.replace(/\/$/, "") || "http://localhost:4000";
  }
  return "http://localhost:4000";
}

class ApiClient {
  private get baseUrl(): string {
    return getBaseUrl();
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `API error ${res.status}`);
      }

      const json = await res.json();
      return json.data as T;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[ApiClient] Request to ${url} failed:`, err);
      }
      return null;
    }
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
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.city) sp.set("city", params.city);
    if (params.state) sp.set("state", params.state);
    if (params.operator) sp.set("operator", params.operator);
    if (params.status) sp.set("status", params.status);
    if (params.connectorType) sp.set("connectorType", params.connectorType);
    if (params.minPowerKw) sp.set("minPowerKw", String(params.minPowerKw));
    if (params.search) sp.set("search", params.search);

    const qs = sp.toString();
    const result = await this.fetchJson<PaginatedResponse<Station>>(
      `/api/v1/stations${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );

    return result || { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
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
    const sp = new URLSearchParams();
    sp.set("latitude", String(params.latitude));
    sp.set("longitude", String(params.longitude));
    if (params.radiusKm) sp.set("radiusKm", String(params.radiusKm));
    if (params.connectorType) sp.set("connectorType", params.connectorType);
    if (params.minPowerKw) sp.set("minPowerKw", String(params.minPowerKw));
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));

    const result = await this.fetchJson<PaginatedResponse<Station & { distanceKm: number }>>(
      `/api/v1/stations/nearby?${sp.toString()}`,
      { cache: "no-store" },
    );

    return result || { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
  }

  async getStation(idOrSlug: string): Promise<Station | null> {
    const result = await this.fetchJson<{ station: Station }>(
      `/api/v1/stations/${encodeURIComponent(idOrSlug)}`,
      { cache: "no-store" },
    );
    return result?.station || null;
  }

  async getCities(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<City>> {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));

    const qs = sp.toString();
    const result = await this.fetchJson<PaginatedResponse<City>>(
      `/api/v1/cities${qs ? `?${qs}` : ""}`,
      { next: { revalidate: 60 } },
    );

    return result || { items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } };
  }

  async getCity(
    slug: string,
    params: { page?: number; pageSize?: number; minPowerKw?: number; connectorType?: string } = {},
  ): Promise<CityDetailResponse | null> {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.minPowerKw) sp.set("minPowerKw", String(params.minPowerKw));
    if (params.connectorType) sp.set("connectorType", params.connectorType);

    const qs = sp.toString();
    return this.fetchJson<CityDetailResponse>(
      `/api/v1/cities/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
  }

  async getPincode(
    pincode: string,
    params: { page?: number; pageSize?: number; radiusKm?: number } = {},
  ): Promise<PincodeDetailResponse | null> {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.radiusKm) sp.set("radiusKm", String(params.radiusKm));

    const qs = sp.toString();
    return this.fetchJson<PincodeDetailResponse>(
      `/api/v1/pincodes/${encodeURIComponent(pincode)}${qs ? `?${qs}` : ""}`,
      { cache: "no-store" },
    );
  }

  async search(params: {
    q: string;
    page?: number;
    pageSize?: number;
    radiusKm?: number;
  }): Promise<SearchResultResponse | null> {
    const sp = new URLSearchParams();
    sp.set("q", params.q);
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    if (params.radiusKm) sp.set("radiusKm", String(params.radiusKm));

    return this.fetchJson<SearchResultResponse>(
      `/api/v1/search?${sp.toString()}`,
      { cache: "no-store" },
    );
  }
}

export const apiClient = new ApiClient();
