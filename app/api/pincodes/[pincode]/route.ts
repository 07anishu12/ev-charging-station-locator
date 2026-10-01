import { NextRequest } from "next/server";

import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { pincodeSchema } from "@/lib/api/validation";
import { getPincodeStationData } from "@/services/pincodes/pincode-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pincode: string }> },
) {
  const { pincode } = await params;
  const parsed = pincodeSchema.safeParse({ pincode });
  if (!parsed.success) return validationError(parsed.error);

  const searchParams = request.nextUrl.searchParams;
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
