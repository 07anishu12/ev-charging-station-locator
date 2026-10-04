export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ConnectorModel {
  id: string;
  type: string;
  normalizedType: "ccs2" | "type2" | "chademo" | "gbt" | string;
  powerKw: number;
  voltage?: number;
  amps?: number;
  status: "available" | "busy" | "unavailable" | "unknown";
  quantity: number;
}

export interface OperatorModel {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
}

export interface CityModel {
  id: string;
  name: string;
  slug: string;
  stateId?: string;
  stateName?: string;
  stateSlug?: string;
  latitude?: number | null;
  longitude?: number | null;
  stationCount: number;
  networkCount?: number;
  fastChargerCount?: number;
}

export interface CityStatisticsModel {
  citySlug: string;
  cityName: string;
  stateSlug?: string;
  stateName?: string;
  stationCount: number;
  networkCount: number;
  fastChargerCount: number;
  totalConnectors?: number;
}

export interface StateModel {
  id: string;
  name: string;
  slug: string;
  code?: string | null;
}

export interface StationModel {
  id: string;
  ocmId?: number | null;
  slug: string;
  name: string;
  operator: OperatorModel;
  address: string;
  city: { name: string; slug: string };
  state: { name: string; slug: string; code: string };
  district?: string;
  pincode: string;
  latitude: number;
  longitude: number;
  status: "Operational" | "Not Operational" | "Unknown";
  operationalStatus: "available" | "busy" | "unavailable" | "unknown";
  usageType?: string | null;
  dataProvider: string;
  dataLicense?: string | null;
  ocmUrl?: string | null;
  lastUpdated: string;
  fastestPowerKw: number;
  connectors: ConnectorModel[];
}

export interface NearbyStationModel extends StationModel {
  distanceKm: number;
}

export interface PincodeModel {
  pincode: string;
  district?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  latitude: number | null;
  longitude: number | null;
}
