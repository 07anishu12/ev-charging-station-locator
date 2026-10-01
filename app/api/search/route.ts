import { NextRequest } from "next/server";

import { apiSuccess, validationError } from "@/lib/api/response";
import { parseQuery, searchQuerySchema } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  const parsed = parseQuery(searchQuerySchema, request.nextUrl.searchParams);
  if (!parsed.success) return validationError(parsed.error);

  return apiSuccess({ query: parsed.data.q, items: [], pagination: { page: parsed.data.page, pageSize: parsed.data.pageSize, total: 0 }, phase: 1 });
}
