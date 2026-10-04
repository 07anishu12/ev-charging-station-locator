import type {
  ChargingDataProvider,
  ProviderStation,
  ProviderStationQuery,
} from "@fastcharger/shared";

export interface RawProviderPayload<T = unknown> {
  provider: string;
  data: T;
  receivedAt: Date;
  recordCount: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderValidationResult {
  valid: boolean;
  errors: string[];
  fatal: boolean;
}

export interface ProviderAdapter extends ChargingDataProvider {
  readonly providerName: string;

  /**
   * Fetches the raw provider payload before any normalization.
   * Encapsulates all provider-specific HTTP headers, API keys, URLs, and query parameters.
   */
  fetchRawStations(query?: ProviderStationQuery): Promise<RawProviderPayload>;

  /**
   * Normalizes a single raw station record into the canonical ProviderStation schema.
   */
  normalizeRawStation(raw: unknown): ProviderStation | null;

  /**
   * Performs provider-level pre-validation on a raw record.
   */
  validateRawRecord?(raw: unknown): ProviderValidationResult;
}
