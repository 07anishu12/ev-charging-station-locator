import { z } from "zod";

export const pincodeParamSchema = z.object({
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "PIN code must be exactly 6 digits."),
});

export const pincodeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  radiusKm: z.coerce.number().positive().max(100).default(5),
});

export type PincodeParams = z.infer<typeof pincodeParamSchema>;
export type PincodeQuery = z.infer<typeof pincodeQuerySchema>;
