export const CONNECTOR_TYPES = ["ccs2", "type2", "chademo", "gbt", "wall", "type1", "other"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const STATION_STATUSES = ["Operational", "Not Operational", "Planned", "Unknown"] as const;
export type StationStatus = (typeof STATION_STATUSES)[number];

export const PAGINATION_DEFAULTS = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;

export const SEARCH_DEFAULTS = {
  defaultRadiusKm: 25,
  maxRadiusKm: 100,
  pincodeRadiusKm: 10,
} as const;
