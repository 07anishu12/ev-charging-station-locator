import { NextRequest } from "next/server";

import { apiError, apiSuccess, validationError } from "@/lib/api/response";
import { citySlugSchema } from "@/lib/api/validation";
import { getCityStationData } from "@/services/stations/station-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = citySlugSchema.safeParse({ slug });
  if (!parsed.success) return validationError(parsed.error);

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limitParam = parseInt(searchParams.get("limit") ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(1, limitParam));
  const minPowerKw = searchParams.get("minPowerKw")
    ? parseFloat(searchParams.get("minPowerKw")!)
    : undefined;
  const connectorType = searchParams.get("connectorType") ?? undefined;

  try {
    const data = await getCityStationData(parsed.data.slug, {
      page,
      pageSize: limit,
      minPowerKw,
      connectorType,
    });

    return apiSuccess({
      city: data.city,
      operators: data.operators,
      stations: data.items,
      pagination: {
        page: data.pagination.page,
        pageSize: data.pagination.pageSize,
        limit: data.pagination.pageSize,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      },
    });
  } catch (error) {
    return apiError(
      "CITY_STATIONS_ERROR",
      error instanceof Error ? error.message : "Failed to retrieve city stations.",
      500,
    );
  }
}
