import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({ items: [], pagination: { page: 1, pageSize: 20, total: 0 }, phase: 1 });
}
