import type {
  ProviderHealth,
  ProviderStation,
  ProviderStationQuery,
} from "@fastcharger/shared";
import { normalizeOpenChargeMapStation } from "../normalization/normalize-station";
import { PermanentError, retryWithBackoff, type RetryOptions } from "./retry";
import type { ProviderAdapter, ProviderValidationResult, RawProviderPayload } from "./types";

const providerName = "open-charge-map";

type OpenChargeMapQuery = ProviderStationQuery & { maxresults?: number; chargepointid?: string; offset?: number };

export interface OpenChargeMapConfig {
  apiKey?: string | null;
  baseUrl?: string;
  defaultPageSize?: number;
  retryOptions?: RetryOptions;
}

export class OpenChargeMapProvider implements ProviderAdapter {
  public readonly providerName = providerName;
  private readonly apiKey: string | null;
  private readonly baseUrl: string;
  private readonly defaultPageSize: number;
  private readonly retryOptions: RetryOptions;

  constructor(config: OpenChargeMapConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OCM_API_KEY ?? process.env.OPENCHARGEMAP_API_KEY ?? null;
    this.baseUrl = config.baseUrl ?? "https://api.openchargemap.io/v3/poi";
    this.defaultPageSize = config.defaultPageSize ?? 20;
    this.retryOptions = config.retryOptions ?? {
      maxRetries: 3,
      initialDelayMs: 200,
      maxDelayMs: 3000,
    };
  }

  /**
   * Fetches raw JSON payload from Open Charge Map API with bounded exponential backoff retries and pagination.
   */
  async fetchRawStations(query: ProviderStationQuery = {}): Promise<RawProviderPayload<unknown[]>> {
    this.assertConfigured();

    const max = query.maxResults ?? query.pageSize ?? 5000;
    const batchSize = Math.min(100, max);
    const allItems: unknown[] = [];
    let currentOffset = 0;

    while (allItems.length < max) {
      const fetchCount = Math.min(batchSize, max - allItems.length);
      const batch = await retryWithBackoff(async () => {
        const response = await this.request({
          ...query,
          maxresults: fetchCount,
          offset: currentOffset,
        });

        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) {
          throw new PermanentError("Open Charge Map returned non-array payload.");
        }

        return payload;
      }, this.retryOptions);

      if (batch.length === 0) break;
      allItems.push(...batch);
      currentOffset += batch.length;
      if (batch.length < fetchCount) break;
    }

    return {
      provider: this.providerName,
      data: allItems,
      receivedAt: new Date(),
      recordCount: allItems.length,
      metadata: {
        countryCode: "IN",
        pageSize: allItems.length,
      },
    };
  }

  /**
   * High-level station fetch conforming to ChargingDataProvider.
   */
  async fetchStations(query: ProviderStationQuery = {}): Promise<ProviderStation[]> {
    const rawPayload = await this.fetchRawStations(query);
    return rawPayload.data
      .map((item) => this.normalizeRawStation(item))
      .filter((station): station is ProviderStation => station !== null);
  }

  /**
   * Normalizes a raw OCM station object.
   */
  normalizeRawStation(raw: unknown): ProviderStation | null {
    return normalizeOpenChargeMapStation(raw);
  }

  /**
   * Pre-validates a raw OCM record before full schema processing.
   */
  validateRawRecord(raw: unknown): ProviderValidationResult {
    if (!raw || typeof raw !== "object") {
      return { valid: false, errors: ["Raw record is not an object"], fatal: true };
    }

    const obj = raw as Record<string, unknown>;
    const errors: string[] = [];

    if (!obj.ID && obj.ID !== 0) {
      errors.push("Missing ID field in raw record");
    }

    const address = obj.AddressInfo as Record<string, unknown> | undefined;
    if (!address || typeof address !== "object") {
      errors.push("Missing AddressInfo in raw record");
      return { valid: false, errors, fatal: true };
    }

    const lat = Number(address.Latitude);
    const lng = Number(address.Longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
      errors.push(`Invalid geographic coordinates in AddressInfo: (${address.Latitude}, ${address.Longitude})`);
      return { valid: false, errors, fatal: true };
    }

    return {
      valid: errors.length === 0,
      errors,
      fatal: false,
    };
  }

  async fetchStation(externalId: string): Promise<ProviderStation | null> {
    this.assertConfigured();

    const payload = await retryWithBackoff(async () => {
      const response = await this.request({ chargepointid: externalId, maxresults: 1 });
      const data: unknown = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      return data[0];
    }, this.retryOptions);

    if (!payload) return null;
    return this.normalizeRawStation(payload);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { provider: providerName, ok: false, message: "OPENCHARGEMAP_API_KEY is not configured." };
    }

    try {
      const response = await this.request({ maxresults: 1 });
      return { provider: providerName, ok: response.ok, message: response.ok ? undefined : response.statusText };
    } catch (error) {
      return {
        provider: providerName,
        ok: false,
        message: error instanceof Error ? error.message : "Provider health check failed.",
      };
    }
  }

  private async request(query: OpenChargeMapQuery) {
    const url = new URL(`${this.baseUrl}/`);
    url.searchParams.set("output", "json");
    url.searchParams.set("countrycode", "IN");
    url.searchParams.set("compact", "false");
    url.searchParams.set("verbose", "false");
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    url.searchParams.set("key", this.apiKey ?? "");

    const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) {
      const err = new Error(`Open Charge Map request failed with status ${response.status}: ${response.statusText}`);
      (err as unknown as { status: number }).status = response.status;
      throw err;
    }
    return response;
  }

  private assertConfigured(): void {
    if (!this.apiKey) throw new PermanentError("OPENCHARGEMAP_API_KEY is not configured.");
  }
}

export function createChargingDataProvider(config?: OpenChargeMapConfig): ProviderAdapter {
  return new OpenChargeMapProvider(config);
}
