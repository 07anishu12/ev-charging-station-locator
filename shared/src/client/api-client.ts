import type { z } from "zod";
import {
  type ApiErrorResponse,
  type ApiResponse,
} from "../contracts/common";
import {
  type StationsQueryInput,
  type NearbyStationsQueryInput,
  type StationSearchResult,
  type StationDetail,
  stationSearchResultSchema,
} from "../contracts/station";
import {
  type CitiesQueryInput,
  type CityStationsQueryInput,
  type CityStationsResponseData,
  type CitySummary,
  type CityStatistics,
  cityStationsResponseDataSchema,
  cityStatisticsResponseDataSchema,
} from "../contracts/city";
import {
  type PincodeQueryInput,
  type PincodeStationResponseData,
  pincodeStationResponseDataSchema,
} from "../contracts/pincode";
import {
  type SearchQueryInput,
  type SearchResponseData,
  searchResponseDataSchema,
} from "../contracts/search";
import type { PaginatedResult } from "../contracts/pagination";

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  validateResponses?: boolean;
}

export class FastChargerApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "FastChargerApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ApiNetworkError extends FastChargerApiError {
  constructor(message: string, details?: unknown) {
    super("NETWORK_ERROR", message, 0, details);
    this.name = "ApiNetworkError";
  }
}

export class ApiHttpError extends FastChargerApiError {
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(code ?? `HTTP_${status}`, message, status, details);
    this.name = "ApiHttpError";
  }
}

export class ApiContractError extends FastChargerApiError {
  constructor(message: string, status = 200, details?: unknown) {
    super("CONTRACT_VIOLATION", message, status, details);
    this.name = "ApiContractError";
  }
}

export class ApiTimeoutError extends FastChargerApiError {
  constructor(message = "Request timed out", details?: unknown) {
    super("TIMEOUT_ERROR", message, 408, details);
    this.name = "ApiTimeoutError";
  }
}

export class FastChargerApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly validateResponses: boolean;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    const rawFetch = config.fetchFn ?? globalThis.fetch;
    this.fetcher = (...args: Parameters<typeof fetch>) => rawFetch.apply(globalThis, args);
    this.validateResponses = config.validateResponses ?? false;
  }

  private async request<T>(
    endpoint: string,
    schema?: z.ZodType<T>,
    options?: RequestInit,
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    let res: Response;
    try {
      res = await this.fetcher(url, {
        headers: {
          Accept: "application/json",
          ...options?.headers,
        },
        ...options,
      });
    } catch (networkError) {
      if (networkError instanceof Error && (networkError.name === "AbortError" || networkError.name === "TimeoutError")) {
        throw new ApiTimeoutError(
          `Request to API service timed out: ${networkError.message}`,
          networkError,
        );
      }
      throw new ApiNetworkError(
        `Failed to communicate with API service: ${networkError instanceof Error ? networkError.message : "Unknown network error"}`,
        networkError,
      );
    }

    const payload = (await res.json().catch(() => null)) as ApiResponse<T> | null;

    if (!res.ok || (payload && "error" in payload)) {
      const errorPayload = payload && "error" in payload ? (payload as ApiErrorResponse).error : undefined;
      const code = errorPayload?.code ?? `HTTP_${res.status}`;
      const message = errorPayload?.message ?? `API request failed with status ${res.status}`;
      const details = errorPayload?.details;
      throw new ApiHttpError(res.status, message, code, details);
    }

    if (!payload || !("data" in payload)) {
      throw new ApiContractError(
        "API returned a non-standard response envelope (missing 'data').",
        res.status,
      );
    }

    const data = payload.data;

    if (this.validateResponses && schema) {
      const parsed = schema.safeParse(data);
      if (!parsed.success) {
        throw new ApiContractError(
          "API response violated the expected contract schema.",
          res.status,
          parsed.error.issues,
        );
      }
      return parsed.data;
    }

    return data;
  }

  // --- Stations ---

  async getStations(query: StationsQueryInput = {}): Promise<StationSearchResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.city) params.set("city", query.city);
    if (query.state) params.set("state", query.state);
    if (query.operator) params.set("operator", query.operator);
    if (query.status) params.set("status", query.status);
    if (query.connectorType) params.set("connectorType", query.connectorType);
    if (query.minPowerKw) params.set("minPowerKw", String(query.minPowerKw));
    if (query.search) params.set("search", query.search);
    if (query.query) params.set("query", query.query);

    const qs = params.toString();
    return this.request<StationSearchResult>(
      `/api/v1/stations${qs ? `?${qs}` : ""}`,
      stationSearchResultSchema,
    );
  }

  async listStations(query: StationsQueryInput = {}): Promise<StationSearchResult> {
    return this.getStations(query);
  }

  async getNearbyStations(query: NearbyStationsQueryInput): Promise<StationSearchResult> {
    const params = new URLSearchParams();
    params.set("latitude", String(query.latitude));
    params.set("longitude", String(query.longitude));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));
    if (query.connectorType) params.set("connectorType", query.connectorType);
    if (query.minPowerKw) params.set("minPowerKw", String(query.minPowerKw));
    if (query.operator) params.set("operator", query.operator);
    if (query.status) params.set("status", query.status);
    if (query.sortBy) params.set("sortBy", query.sortBy);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));

    return this.request<StationSearchResult>(
      `/api/v1/stations/nearby?${params.toString()}`,
      stationSearchResultSchema,
    );
  }

  async findNearbyStations(query: NearbyStationsQueryInput): Promise<StationSearchResult> {
    return this.getNearbyStations(query);
  }

  async getStation(slug: string): Promise<StationDetail | null> {
    try {
      const result = await this.request<{ station: StationDetail | null; phase?: number }>(
        `/api/v1/stations/${encodeURIComponent(slug)}`,
      );
      return result?.station ?? null;
    } catch (err) {
      if (err instanceof FastChargerApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  // --- Cities ---

  async getCities(query: CitiesQueryInput = {}): Promise<PaginatedResult<CitySummary>> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));

    const qs = params.toString();
    return this.request<PaginatedResult<CitySummary>>(`/api/v1/cities${qs ? `?${qs}` : ""}`);
  }

  async listCities(query: CitiesQueryInput = {}): Promise<PaginatedResult<CitySummary>> {
    return this.getCities(query);
  }

  async getCity(
    slug: string,
    query: CityStationsQueryInput = {},
  ): Promise<CityStationsResponseData | null> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.minPowerKw) params.set("minPowerKw", String(query.minPowerKw));
    if (query.connectorType) params.set("connectorType", query.connectorType);

    const qs = params.toString();
    try {
      return await this.request<CityStationsResponseData>(
        `/api/v1/cities/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
        cityStationsResponseDataSchema,
      );
    } catch (err) {
      if (err instanceof FastChargerApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async getCityStations(
    slug: string,
    query: CityStationsQueryInput = {},
  ): Promise<CityStationsResponseData | null> {
    return this.getCity(slug, query);
  }

  async getCityStatistics(slug: string): Promise<CityStatistics | null> {
    try {
      return await this.request<CityStatistics>(
        `/api/v1/cities/${encodeURIComponent(slug)}/statistics`,
        cityStatisticsResponseDataSchema,
      );
    } catch (err) {
      if (err instanceof FastChargerApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  // --- Pincodes ---

  async getPincode(
    pincode: string,
    query: PincodeQueryInput = {},
  ): Promise<PincodeStationResponseData | null> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));

    const qs = params.toString();
    try {
      return await this.request<PincodeStationResponseData>(
        `/api/v1/pincodes/${encodeURIComponent(pincode)}${qs ? `?${qs}` : ""}`,
        pincodeStationResponseDataSchema,
      );
    } catch (err) {
      if (err instanceof FastChargerApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async getPincodeStations(
    pincode: string,
    query: PincodeQueryInput = {},
  ): Promise<PincodeStationResponseData | null> {
    return this.getPincode(pincode, query);
  }

  // --- Search ---

  async search(query: SearchQueryInput): Promise<SearchResponseData | null> {
    const params = new URLSearchParams();
    params.set("q", query.q);
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.radiusKm) params.set("radiusKm", String(query.radiusKm));

    try {
      return await this.request<SearchResponseData>(
        `/api/v1/search?${params.toString()}`,
        searchResponseDataSchema,
      );
    } catch (err) {
      if (err instanceof FastChargerApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }
}
