import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { stationIdSchema } from "@/lib/api/validation";
import { getStation } from "@/services/stations/station-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  void request;
  const { id } = await params;
  const parsed = stationIdSchema.safeParse({ id });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const station = await getStation(parsed.data.id);
    return apiSuccess({ station, phase: 1 });
  } catch {
    return apiError("STATION_UNAVAILABLE", "Station details are temporarily unavailable.", 503);
  }
}
