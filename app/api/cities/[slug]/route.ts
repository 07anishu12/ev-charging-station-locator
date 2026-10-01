import { apiSuccess, validationError } from "@/lib/api/response";
import { citySlugSchema } from "@/lib/api/validation";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  void request;
  const { slug } = await params;
  const parsed = citySlugSchema.safeParse({ slug });
  if (!parsed.success) return validationError(parsed.error);

  return apiSuccess({ city: null, slug: parsed.data.slug, stations: [], phase: 1 });
}
