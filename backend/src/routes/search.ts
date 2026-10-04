import { parseQuery, searchQuerySchema } from "@fastcharger/shared";
import { apiError, apiSuccess, validationError } from "../utils/response";
import { searchMockEntities, type SearchEntityResult } from "../mock";
import { findStationsNearPincode } from "../services/pincode-service";

export async function handleSearch(searchParams: URLSearchParams): Promise<Response> {
  const parsed = parseQuery(searchQuerySchema, searchParams);
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, pageSize } = parsed.data;
  const cleanQ = q.trim();

  // 1. If query is a 6-digit Indian PIN code, perform geographic PIN discovery
  if (/^\d{6}$/.test(cleanQ)) {
    try {
      const radiusKmParam = searchParams.get("radiusKm");
      const radiusKm = radiusKmParam ? parseFloat(radiusKmParam) : 10;

      const pincodeResult = await findStationsNearPincode(cleanQ, {
        radiusKm: isNaN(radiusKm) ? 10 : radiusKm,
        page,
        limit: pageSize,
        progressiveFallback: true,
      });

      return apiSuccess({
        query: cleanQ,
        ...pincodeResult,
      });
    } catch (error) {
      return apiError(
        "PINCODE_SEARCH_ERROR",
        error instanceof Error ? error.message : "Failed to search PIN code.",
        500,
      );
    }
  }

  // 2. Otherwise perform text-based entity search across cities, operators, stations, pincodes
  const results = searchMockEntities(cleanQ);

  const categorized: {
    cities: SearchEntityResult[];
    stations: SearchEntityResult[];
    operators: SearchEntityResult[];
    pincodes: SearchEntityResult[];
  } = {
    cities: [],
    stations: [],
    operators: [],
    pincodes: [],
  };

  for (const item of results) {
    if (item.type === "city") categorized.cities.push(item);
    else if (item.type === "station") categorized.stations.push(item);
    else if (item.type === "operator") categorized.operators.push(item);
    else if (item.type === "pincode") categorized.pincodes.push(item);
  }

  const offset = (page - 1) * pageSize;
  const pagedItems = results.slice(offset, offset + pageSize);

  return apiSuccess({
    searchType: "text",
    query: cleanQ,
    items: pagedItems,
    categorized,
    resultCount: results.length,
    pagination: {
      page,
      pageSize,
      total: results.length,
      totalPages: Math.max(1, Math.ceil(results.length / pageSize)),
      hasMore: offset + pageSize < results.length,
    },
  });
}
