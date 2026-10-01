import { NextRequest } from "next/server";

import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { parseQuery, stationsQuerySchema } from "@/lib/api/validation";
import { listStations } from "@/services/stations/station-service";

export async function GET(request: NextRequest) {
  const parsed = parseQuery(stationsQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) return validationError(parsed.error);

  try {
    return apiSuccess(await listStations(parsed.data));
  } catch {
    return apiError("STATIONS_UNAVAILABLE", "Station search is temporarily unavailable.", 503);
  }
}
