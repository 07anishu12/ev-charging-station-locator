import { z } from "zod";
import type { ProviderConnector, ProviderStation } from "@fastcharger/shared";

export function normalizeConnectorType(rawTitle?: string | null): string {
  if (!rawTitle) return "other";
  const lower = rawTitle.toLowerCase().trim();
  if (
    lower.includes("ccs") ||
    lower.includes("combo 2") ||
    lower.includes("iec 62196-3") ||
    lower.includes("configuration ff")
  ) {
    return "ccs2";
  }
  if (
    lower.includes("type 2") ||
    lower.includes("type-2") ||
    lower.includes("mennekes") ||
    lower.includes("iec 62196-2")
  ) {
    return "type2";
  }
  if (lower.includes("chademo")) return "chademo";
  if (lower.includes("gb/t") || lower.includes("gbt") || lower.includes("gb-t")) return "gbt";
  if (lower.includes("type 1") || lower.includes("type-1") || lower.includes("j1772")) return "type1";
  if (lower.includes("tesla")) return "tesla";
  if (
    lower.includes("wall") ||
    lower.includes("bs 1363") ||
    lower.includes("bs1363") ||
    lower.includes("3-pin") ||
    lower.includes("three phase") ||
    lower.includes("schuko") ||
    lower.includes("household")
  ) {
    return "wall";
  }
  return "other";
}

export function normalizeStationStatus(
  statusTitle?: string | null,
  isOperational?: boolean | null,
): string {
  if (statusTitle) {
    const lower = statusTitle.toLowerCase();
    if (lower.includes("operational") && !lower.includes("not") && !lower.includes("non")) {
      return "Operational";
    }
    if (lower.includes("plan") || lower.includes("construction")) {
      return "Planned";
    }
    if (
      lower.includes("unavailable") ||
      lower.includes("not operational") ||
      lower.includes("offline")
    ) {
      return "Not Operational";
    }
  }
  if (isOperational === true) return "Operational";
  if (isOperational === false) return "Not Operational";
  return "unknown";
}

function sanitizeOperatorName(title?: string | null): string | null {
  if (!title) return null;
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === "(unknown operator)" ||
    lower === "unknown operator" ||
    lower === "unknown" ||
    lower === "(business owner at this location)" ||
    lower === "none" ||
    lower === "n/a"
  ) {
    return null;
  }
  return trimmed;
}

const addressInfoSchema = z
  .object({
    Title: z.string().nullable().optional(),
    AddressLine1: z.string().nullable().optional(),
    AddressLine2: z.string().nullable().optional(),
    Town: z.string().nullable().optional(),
    StateOrProvince: z.string().nullable().optional(),
    Postcode: z.string().nullable().optional(),
    Latitude: z.coerce.number(),
    Longitude: z.coerce.number(),
    RelatedURL: z.string().nullable().optional(),
  })
  .passthrough();

const connectionSchema = z
  .object({
    ID: z.coerce.number().int().optional().nullable(),
    ConnectionTypeID: z.coerce.number().int().optional().nullable(),
    ConnectionType: z
      .object({
        Title: z.string().nullable().optional(),
        FormalName: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    Level: z
      .object({
        Title: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    PowerKW: z.coerce.number().nonnegative().nullable().optional(),
    Voltage: z.coerce.number().nonnegative().nullable().optional(),
    Amps: z.coerce.number().nonnegative().nullable().optional(),
    StatusType: z
      .object({
        Title: z.string().nullable().optional(),
        IsOperational: z.boolean().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    Quantity: z.coerce.number().int().positive().nullable().optional(),
  })
  .passthrough();

const operatorInfoSchema = z
  .object({
    ID: z.coerce.number().optional().nullable(),
    Title: z.string().nullable().optional(),
    WebsiteURL: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const statusTypeSchema = z
  .object({
    ID: z.coerce.number().optional().nullable(),
    Title: z.string().nullable().optional(),
    IsOperational: z.boolean().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const usageTypeSchema = z
  .object({
    ID: z.coerce.number().optional().nullable(),
    Title: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const dataProviderSchema = z
  .object({
    ID: z.coerce.number().optional().nullable(),
    Title: z.string().nullable().optional(),
    License: z.string().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const openChargeMapStationSchema = z
  .object({
    ID: z.coerce.number().int(),
    UUID: z.string().optional(),
    AddressInfo: addressInfoSchema,
    Connections: z.array(connectionSchema).optional().nullable(),
    OperatorInfo: operatorInfoSchema,
    StatusType: statusTypeSchema,
    UsageType: usageTypeSchema,
    DataProvider: dataProviderSchema,
    DateLastVerified: z.string().nullable().optional(),
    DateLastStatusUpdate: z.string().nullable().optional(),
  })
  .passthrough();

type OpenChargeMapStation = z.infer<typeof openChargeMapStationSchema>;

function joinAddress(address: OpenChargeMapStation["AddressInfo"]): string | null {
  const parts = [
    address.AddressLine1,
    address.AddressLine2,
    address.Town,
    address.StateOrProvince,
    address.Postcode,
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}

export function normalizeOpenChargeMapStation(input: unknown): ProviderStation | null {
  const parsed = openChargeMapStationSchema.safeParse(input);
  if (!parsed.success) return null;

  const data = parsed.data;
  const address = data.AddressInfo;
  const rawConnections = data.Connections ?? [];

  const connectors: ProviderConnector[] = rawConnections.map((c) => {
    const rawType = c.ConnectionType?.Title ?? c.ConnectionType?.FormalName ?? null;
    const normalizedType = normalizeConnectorType(rawType);
    const connStatus = normalizeStationStatus(c.StatusType?.Title, c.StatusType?.IsOperational);

    return {
      ocmConnectionId: c.ID ?? null,
      type: rawType || (c.ConnectionTypeID ? `Type ${c.ConnectionTypeID}` : "unknown"),
      normalizedType,
      level: c.Level?.Title ?? null,
      powerKw: c.PowerKW ?? null,
      voltage: c.Voltage ?? null,
      amps: c.Amps ?? null,
      status: connStatus,
      quantity: c.Quantity ?? 1,
    };
  });

  const operatorName = sanitizeOperatorName(data.OperatorInfo?.Title);
  const operatorWebsite = operatorName ? data.OperatorInfo?.WebsiteURL?.trim() || null : null;
  const stationStatus = normalizeStationStatus(data.StatusType?.Title, data.StatusType?.IsOperational);

  let lastVerifiedAt: Date | null = null;
  const dateStr = data.DateLastVerified || data.DateLastStatusUpdate;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) lastVerifiedAt = d;
  }

  return {
    externalId: String(data.ID),
    ocmId: data.ID,
    name: address.Title?.trim() ?? null,
    latitude: address.Latitude,
    longitude: address.Longitude,
    address: joinAddress(address),
    city: address.Town?.trim() || null,
    state: address.StateOrProvince?.trim() || null,
    district: address.Town?.trim() || address.StateOrProvince?.trim() || null,
    pincode: address.Postcode?.trim() || null,
    operatorName,
    operatorWebsite,
    status: stationStatus,
    usageType: data.UsageType?.Title?.trim() || null,
    dataProvider: data.DataProvider?.Title?.trim() || "Open Charge Map",
    dataLicense: data.DataProvider?.License?.trim() || null,
    ocmUrl: `https://openchargemap.org/site/poi/details/${data.ID}`,
    lastVerifiedAt,
    connectors,
  };
}
