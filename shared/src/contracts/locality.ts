import { z } from "zod";
import { latitudeSchema, longitudeSchema } from "./common";

export const localitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  citySlug: z.string().min(1),
  stateSlug: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  stationCount: z.number().int().nonnegative(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
});

export type Locality = z.infer<typeof localitySchema>;
