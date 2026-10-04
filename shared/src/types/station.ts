import type { ConnectorType } from "../constants";

export type {
  ChargerStatus,
  StationConnector,
  StationSummary,
  StationSearchResult,
} from "../contracts/station";

export interface MockState {
  id: string;
  name: string;
  slug: string;
  code: string;
  stationCount: number;
  cityCount: number;
  latitude: number;
  longitude: number;
}

export interface MockCity {
  id: string;
  name: string;
  slug: string;
  stateName: string;
  stateSlug: string;
  stationCount: number;
  fastChargerCount: number;
  latitude: number;
  longitude: number;
  popularPincodes: string[];
}

export interface MockOperator {
  id: string;
  name: string;
  slug: string;
  stationCount: number;
  website: string;
}

export interface MockConnector {
  id?: string;
  type: string;
  normalizedType?: ConnectorType;
  powerKw?: number;
  voltage?: number;
  amps?: number;
  status: "available" | "busy" | "unavailable" | "unknown";
  quantity?: number;
}

export interface MockStation {
  id: string;
  ocmId: number;
  slug: string;
  name: string;
  operator: {
    id: string;
    name: string;
    slug: string;
    website?: string;
  };
  address: string;
  city: {
    name: string;
    slug: string;
  };
  state: {
    name: string;
    slug: string;
    code: string;
  };
  district: string;
  pincode: string;
  latitude: number;
  longitude: number;
  status: "Operational" | "Not Operational" | "Unknown";
  operationalStatus: "available" | "busy" | "unavailable" | "unknown";
  usageType: string;
  dataProvider: string;
  dataLicense: string;
  ocmUrl: string;
  lastUpdated: string;
  connectors: MockConnector[];
  fastestPowerKw: number;
  distanceKm?: number;
  distanceMeters?: number;
  matchType?: "exact_pincode" | "nearby_pincode" | "same_city" | "radius";
  stationPincode?: string | null;
  stationCity?: string;
  stationState?: string;
}

export type { SearchEntityResult } from "../contracts/search";

export type { Station } from "../contracts/station";
export type City = MockCity;
export type State = MockState;
export type Operator = MockOperator;
export type Connector = MockConnector;

