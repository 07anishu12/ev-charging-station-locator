export type ChargerStatus = "available" | "busy" | "unavailable" | "unknown";

export interface StationConnector {
  type: string;
  powerKw?: number;
  status: ChargerStatus;
}

export interface StationSummary {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  status: ChargerStatus;
  connectors: StationConnector[];
}

export interface StationSearchResult {
  items: StationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
