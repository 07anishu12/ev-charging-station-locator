import { z } from "zod";
import { latitudeSchema, longitudeSchema } from "./common";

export const boundingBoxQuerySchema = z.object({
  minLat: latitudeSchema,
  maxLat: latitudeSchema,
  minLng: longitudeSchema,
  maxLng: longitudeSchema,
});

export const geographicEntitySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const distanceSchema = z.object({
  km: z.number().nonnegative(),
  meters: z.number().nonnegative(),
});

export type BoundingBoxQuery = z.infer<typeof boundingBoxQuerySchema>;
export type GeographicEntity = z.infer<typeof geographicEntitySchema>;
export type Distance = z.infer<typeof distanceSchema>;
