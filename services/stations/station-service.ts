import type { StationSearchResult } from "@/types/station";

export interface StationListQuery {
  page: number;
  pageSize: number;
  query?: string;
}

export interface NearbyStationQuery extends StationListQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

const EMPTY_RESULT: StationSearchResult = {
  items: [],
  pagination: { page: 1, pageSize: 20, total: 0 },
};

/**
 * Phase 1 intentionally exposes an empty repository boundary rather than fake station data.
 * Database-backed reads will be added behind these functions after ingestion is wired.
 */
export async function listStations(query: StationListQuery): Promise<StationSearchResult> {
  return { ...EMPTY_RESULT, pagination: { ...EMPTY_RESULT.pagination, ...query } };
}

export async function findNearbyStations(query: NearbyStationQuery): Promise<StationSearchResult> {
  return listStations(query);
}

export async function getStation(id: string) {
  void id;
  return null;
}
