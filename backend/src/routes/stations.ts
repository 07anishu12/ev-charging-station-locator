import { parseQuery, stationsQuerySchema, nearbyStationsQuerySchema, stationIdSchema } from "@fastcharger/shared";
import { apiError, apiSuccess, validationError } from "../utils/response";
import { listStations, getStation, findNearbyStations } from "../services/station-service";

export async function handleListStations(searchParams: URLSearchParams): Promise<Response> {
  const parsed = parseQuery(stationsQuerySchema, searchParams);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await listStations(parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError("STATIONS_UNAVAILABLE", "Station search is temporarily unavailable.", 503);
  }
}

export async function handleGetStation(id: string): Promise<Response> {
  const parsed = stationIdSchema.safeParse({ id });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const station = await getStation(parsed.data.id);
    return apiSuccess({ station, phase: 1 });
  } catch {
    return apiError("STATION_UNAVAILABLE", "Station details are temporarily unavailable.", 503);
  }
}

export async function handleNearbyStations(searchParams: URLSearchParams): Promise<Response> {
  const parsed = parseQuery(nearbyStationsQuerySchema, searchParams);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await findNearbyStations(parsed.data);
    return apiSuccess(result);
  } catch {
    return apiError("NEARBY_STATIONS_UNAVAILABLE", "Nearby station search is temporarily unavailable.", 503);
  }
}
