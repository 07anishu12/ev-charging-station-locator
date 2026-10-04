import { citySlugSchema } from "@fastcharger/shared";
import { apiError, apiSuccess, validationError } from "../utils/response";
import { getCityStationData, listCities } from "../services/station-service";

export async function handleListCities(): Promise<Response> {
  try {
    const result = await listCities();
    return apiSuccess(result);
  } catch {
    return apiError("CITIES_UNAVAILABLE", "City list is temporarily unavailable.", 503);
  }
}

export async function handleGetCityStations(slug: string, searchParams: URLSearchParams): Promise<Response> {
  const parsed = citySlugSchema.safeParse({ slug });
  if (!parsed.success) return validationError(parsed.error);

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
