import { apiSuccess, validationError } from "@/lib/api/response";
import { pincodeSchema } from "@/lib/api/validation";

export async function GET(request: Request, { params }: { params: Promise<{ pincode: string }> }) {
  void request;
  const { pincode } = await params;
  const parsed = pincodeSchema.safeParse({ pincode });
  if (!parsed.success) return validationError(parsed.error);

  return apiSuccess({ pincode: parsed.data.pincode, items: [], pagination: { page: 1, pageSize: 20, total: 0 }, phase: 1 });
}
