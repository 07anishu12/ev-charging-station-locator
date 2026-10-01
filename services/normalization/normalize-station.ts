import { z } from "zod";

import type { ProviderStation } from "@/types/providers";

const addressInfoSchema = z
  .object({
    Title: z.string().nullable().optional(),
    AddressLine1: z.string().nullable().optional(),
    Town: z.string().nullable().optional(),
    StateOrProvince: z.string().nullable().optional(),
    Latitude: z.coerce.number().min(-90).max(90),
    Longitude: z.coerce.number().min(-180).max(180),
  })
  .passthrough();

const connectionSchema = z
  .object({
    ConnectionType: z.object({ Title: z.string().nullable().optional() }).passthrough().nullable().optional(),
    PowerKW: z.coerce.number().nonnegative().nullable().optional(),
  })
  .passthrough();

const openChargeMapStationSchema = z
  .object({
    ID: z.coerce.string(),
    AddressInfo: addressInfoSchema,
    Connections: z.array(connectionSchema).optional(),
  })
  .passthrough();

type OpenChargeMapStation = z.infer<typeof openChargeMapStationSchema>;

function joinAddress(address: OpenChargeMapStation["AddressInfo"]): string | null {
  const parts = [address.AddressLine1, address.Town, address.StateOrProvince].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export function normalizeOpenChargeMapStation(input: unknown): ProviderStation | null {
  const parsed = openChargeMapStationSchema.safeParse(input);
  if (!parsed.success) return null;

  const { AddressInfo: address, Connections: connections = [] } = parsed.data;
  return {
    externalId: parsed.data.ID,
    name: address.Title ?? null,
    latitude: address.Latitude,
    longitude: address.Longitude,
    address: joinAddress(address),
    connectors: connections.map((connection) => ({
      type: connection.ConnectionType?.Title ?? "unknown",
      powerKw: connection.PowerKW ?? null,
    })),
  };
}
