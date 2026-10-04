import { pincodeSchema } from "@fastcharger/shared";
import { apiError, apiSuccess, validationError } from "../utils/response";
import { getPincodeStationData } from "../services/pincode-service";

export async function handleGetPincode(pincode: string, searchParams: URLSearchParams): Promise<Response> {
  const parsed = pincodeSchema.safeParse({ pincode });
  if (!parsed.success) return validationError(parsed.error);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limitParam =
    parseInt(searchParams.get("limit") ?? searchParams.get("pageSize") ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, limitParam));
  const radiusKm = Math.min(
    50,
    Math.max(1, parseFloat(searchParams.get("radiusKm") ?? "5") || 5),
  );

  try {
    const data = await getPincodeStationData(parsed.data.pincode, {
      page,
      limit,
      radiusKm,
    });

    return apiSuccess({
      pincode: data.pincode,
      location: data.location,
      stations: data.stations,
      total: data.total,
      exactPincodeCount: data.exactPincodeCount,
      nearbyPincodeCount: data.nearbyPincodeCount,
      radiusCount: data.radiusCount,
      nearbyPincodes: data.nearbyPincodes,
      radiusKm: data.radiusKm,
      pagination: data.pagination,
    });
  } catch (error) {
    return apiError(
      "PINCODE_STATIONS_ERROR",
      error instanceof Error ? error.message : "Failed to retrieve stations for PIN code.",
      500,
    );
  }
}
