import { z } from "zod";
import { latitudeSchema, longitudeSchema } from "./common";
import { paginationMetaSchema, paginationQuerySchema } from "./pagination";
import { stationDetailSchema } from "./station";

export const pincodeParamSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "PIN code must be exactly 6 digits."),
});
export const pincodeSchema = pincodeParamSchema;

export const pincodeQuerySchema = paginationQuerySchema.extend({
  radiusKm: z.coerce.number().positive().max(100).default(5),
});

export const pincodeLocationSchema = z.object({
  city: z.string().min(1),
  citySlug: z.string().min(1),
  state: z.string().min(1),
  stateSlug: z.string().min(1),
  stateCode: z.string().min(1),
  district: z.string().min(1),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  hasCoordinates: z.boolean(),
});

export const nearbyPincodeItemSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().min(1),
  district: z.string().min(1),
  distanceKm: z.number().nonnegative(),
});

export const pincodeStationResponseDataSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  location: pincodeLocationSchema,
  stations: z.array(stationDetailSchema),
  total: z.number().int().nonnegative(),
  exactPincodeCount: z.number().int().nonnegative(),
  nearbyPincodeCount: z.number().int().nonnegative(),
  radiusCount: z.number().int().nonnegative(),
  nearbyPincodes: z.array(nearbyPincodeItemSchema),
  radiusKm: z.number().positive(),
  pagination: paginationMetaSchema,
});

export type PincodeParams = z.infer<typeof pincodeParamSchema>;
export type PincodeQuery = z.infer<typeof pincodeQuerySchema>;
export type PincodeQueryInput = z.input<typeof pincodeQuerySchema>;
export type PincodeLocation = z.infer<typeof pincodeLocationSchema>;
export type NearbyPincodeItem = z.infer<typeof nearbyPincodeItemSchema>;
export type PincodeStationResponseData = z.infer<typeof pincodeStationResponseDataSchema>;
