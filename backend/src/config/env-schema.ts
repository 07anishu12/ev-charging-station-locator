import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

const optionalDatabaseUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .url()
    .refine(
      (val) => val.startsWith("postgres://") || val.startsWith("postgresql://"),
      { message: "DATABASE_URL must start with postgres:// or postgresql://" },
    )
    .optional(),
);

export const environmentSchema = z
  .object({
    DATABASE_URL: optionalDatabaseUrl,
    OPENCHARGEMAP_API_KEY: optionalString,
    OCM_API_KEY: optionalString,
    NEXT_PUBLIC_SITE_URL: optionalUrl,
    PORT: z.coerce.number().optional().default(4000),
  })
  .transform((values) => ({
    databaseUrl: values.DATABASE_URL ?? null,
    openChargeMapApiKey: values.OCM_API_KEY ?? values.OPENCHARGEMAP_API_KEY ?? null,
    siteUrl: values.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    port: values.PORT ?? 4000,
  }));

export type AppEnvironment = z.output<typeof environmentSchema>;

export function parseEnvironment(input: Record<string, string | undefined>): AppEnvironment {
  return environmentSchema.parse(input);
}
