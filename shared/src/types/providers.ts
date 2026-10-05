export interface ProviderConnector {
  providerConnectorId?: string;
  sourceProvider?: string;
  ocmConnectionId: number | null;
  type: string;
  normalizedType: string;
  level: string | null;
  powerKw: number | null;
  voltage: number | null;
  amps: number | null;
  status: string;
  quantity: number;
}

export interface ProviderStation {
  sourceUrl?: string | null;
  sourceType?: string;
  sourceUpdatedAt?: Date | null;
  sourceObservedAt?: Date | null;
  sourceLastSeenAt?: Date | null;
  provenance?: Array<{ provider: string; id: string; url?: string | null; type: string; updatedAt?: Date | null; lastSeenAt?: Date | null; evidence?: unknown }>;
  researchCanonicalId?: string;
  externalId: string;
  ocmId: number | null;
  name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  pincode: string | null;
  operatorName: string | null;
  operatorWebsite: string | null;
  status: string;
  usageType: string | null;
  dataProvider: string;
  dataLicense: string | null;
  ocmUrl: string | null;
  lastVerifiedAt: Date | null;
  connectors: ProviderConnector[];
}

export interface ProviderStationQuery {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
  maxResults?: number;
  compact?: boolean;
  verbose?: boolean;
}

export interface ProviderHealth {
  provider: string;
  ok: boolean;
  message?: string;
}

export interface ChargingDataProvider {
  fetchStations(query?: ProviderStationQuery): Promise<ProviderStation[]>;
  fetchStation(externalId: string): Promise<ProviderStation | null>;
  healthCheck(): Promise<ProviderHealth>;
}
