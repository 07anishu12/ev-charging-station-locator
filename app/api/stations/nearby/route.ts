import { NextRequest } from "next/server";

import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { nearbyStationsQuerySchema, parseQuery } from "@/lib/api/validation";
import { findNearbyStations } from "@/services/stations/station-service";

export async function GET(request: NextRequest) {
  const parsed = parseQuery(nearbyStationsQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) return validationError(parsed.error);

  try {
    return apiSuccess(await findNearbyStations(parsed.data));
  } catch {
    return apiError("NEARBY_STATIONS_UNAVAILABLE", "Nearby station search is temporarily unavailable.", 503);
  }
}
