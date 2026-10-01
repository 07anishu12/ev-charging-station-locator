import "server-only";

import { appConfig } from "@/lib/config";
import { normalizeOpenChargeMapStation } from "@/services/normalization/normalize-station";
import type { ChargingDataProvider, ProviderHealth, ProviderStation, ProviderStationQuery } from "@/types/providers";

const providerName = "open-charge-map";

type OpenChargeMapQuery = ProviderStationQuery & { maxresults?: number };

export class OpenChargeMapProvider implements ChargingDataProvider {
  private readonly apiKey = appConfig.providers.openChargeMap.apiKey;
  private readonly baseUrl = appConfig.providers.openChargeMap.baseUrl;

  async fetchStations(query: ProviderStationQuery = {}): Promise<ProviderStation[]> {
    this.assertConfigured();
    const response = await this.request({
      ...query,
      maxresults: query.pageSize ?? appConfig.pagination.defaultPageSize,
    });
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.map(normalizeOpenChargeMapStation).filter((station): station is ProviderStation => station !== null);
  }

  async fetchStation(externalId: string): Promise<ProviderStation | null> {
    this.assertConfigured();
    const response = await this.request({ chargepointid: externalId, maxresults: 1 });
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || payload.length === 0) return null;
    return normalizeOpenChargeMapStation(payload[0]);
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

  private async request(query: OpenChargeMapQuery & { chargepointid?: string }) {
    const url = new URL(`${this.baseUrl}/`);
    url.searchParams.set("output", "json");
    url.searchParams.set("countrycode", "IN");
    url.searchParams.set("compact", "true");
    url.searchParams.set("verbose", "false");
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    url.searchParams.set("key", this.apiKey ?? "");

    const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Open Charge Map request failed with status ${response.status}.`);
    return response;
  }

  private assertConfigured(): void {
    if (!this.apiKey) throw new Error("OPENCHARGEMAP_API_KEY is not configured.");
  }
}
