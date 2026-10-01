export interface ProviderStation {
  externalId: string;
  name: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  connectors: Array<{
    type: string;
    powerKw: number | null;
  }>;
}

export interface ProviderStationQuery {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  pageSize?: number;
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
