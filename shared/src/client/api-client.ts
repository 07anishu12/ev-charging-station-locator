import type { ApiResponse } from "../contracts/response";
import type { MockStation, SearchEntityResult, StationSearchResult } from "../types/station";

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
}

export class FastChargerApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.fetcher = config.fetchFn ?? fetch;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await this.fetcher(url, {
      headers: {
        accept: "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorJson = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      throw new Error(
        errorJson?.error?.message || `API request failed with status ${res.status}: ${res.statusText}`,
      );
    }

    const payload = (await res.json()) as ApiResponse<T>;
    if ("error" in payload) {
      throw new Error(payload.error.message);
    }
    return payload.data;
  }

  async listStations(query: {
    page?: number;
    pageSize?: number;
    query?: string;
  } = {}): Promise<StationSearchResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.query) params.set("query", query.query);
    const qs = params.toString();
    return this.request<StationSearchResult>(`/api/stations${qs ? `?${qs}` : ""}`);
  }

  async findNearbyStations(query: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    page?: number;
    pageSize?: number;
  }): Promise<StationSearchResult> {
    const params = new URLSearchParams();
    params.set("latitude", String(query.latitude));
    params.set("longitude", String(query.longitude));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    return this.request<StationSearchResult>(`/api/stations/nearby?${params.toString()}`);
  }

  async getStation(idOrSlug: string): Promise<{ station: MockStation | null; phase?: number }> {
    return this.request<{ station: MockStation | null; phase?: number }>(
      `/api/stations/${encodeURIComponent(idOrSlug)}`,
    );
  }

  async listCities(): Promise<{ items: unknown[]; pagination: unknown }> {
    return this.request<{ items: unknown[]; pagination: unknown }>("/api/cities");
  }

  async getCityStations(
    citySlug: string,
    query: {
      page?: number;
      limit?: number;
      minPowerKw?: number;
      connectorType?: string;
    } = {},
  ): Promise<{
    city: {
      name: string;
      slug: string;
      stateName: string;
      stateSlug: string;
      stationCount: number;
      latitude?: number;
      longitude?: number;
    };
    operators: Array<{ name: string; slug: string; stationCount: number }>;
    stations: MockStation[];
    pagination: {
      page: number;
      pageSize: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.minPowerKw) params.set("minPowerKw", String(query.minPowerKw));
    if (query.connectorType) params.set("connectorType", query.connectorType);
    const qs = params.toString();
    return this.request(`/api/cities/${encodeURIComponent(citySlug)}${qs ? `?${qs}` : ""}`);
  }

  async getPincodeStations(
    pincode: string,
    query: {
      page?: number;
      limit?: number;
      radiusKm?: number;
    } = {},
  ): Promise<{
    pincode: string;
    location: {
      city: string;
      citySlug: string;
      state: string;
      stateSlug: string;
      stateCode: string;
      district: string;
      latitude: number | null;
      longitude: number | null;
      hasCoordinates: boolean;
    };
    stations: MockStation[];
    total: number;
    exactPincodeCount: number;
    nearbyPincodeCount: number;
    radiusCount: number;
    nearbyPincodes: Array<{
      pincode: string;
      city: string;
      district: string;
      distanceKm: number;
    }>;
    radiusKm: number;
    pagination: {
      page: number;
      limit: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));
    const qs = params.toString();
    return this.request(`/api/pincodes/${encodeURIComponent(pincode)}${qs ? `?${qs}` : ""}`);
  }

  async search(query: {
    q: string;
    page?: number;
    pageSize?: number;
    radiusKm?: number;
  }): Promise<{
    searchType: "text" | "pincode";
    query: string;
    items?: SearchEntityResult[];
    results?: MockStation[];
    origin?: {
      city: string;
      citySlug: string;
      state: string;
      stateSlug: string;
      stateCode: string;
      district: string;
      latitude: number | null;
      longitude: number | null;
      hasCoordinates: boolean;
    };
    nearbyPincodes?: Array<{
      pincode: string;
      city: string;
      district: string;
      distanceKm: number;
    }>;
    counts?: { exact: number; nearby: number; total: number };
    radiusKm?: number;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
      hasMore?: boolean;
    };
  }> {
    const params = new URLSearchParams();
    params.set("q", query.q);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));
    return this.request(`/api/search?${params.toString()}`);
  }
}
