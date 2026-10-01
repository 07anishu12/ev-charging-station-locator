import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateStationSlug,
  ingestStations,
  isValidCoordinate,
  validateIndianPincode,
} from "@/services/ingestion/ingest-stations";
import {
  normalizeConnectorType,
  normalizeOpenChargeMapStation,
  normalizeStationStatus,
} from "@/services/normalization/normalize-station";
import type { getDb } from "@/lib/db/client";
import type { ChargingDataProvider, ProviderStation } from "@/types/providers";

describe("ingestion coordinate and PIN validation", () => {
  it("validates geographic coordinates correctly", () => {
    // Valid Indian coordinates
    expect(isValidCoordinate(28.6139, 77.209)).toBe(true); // Delhi
    expect(isValidCoordinate(12.9716, 77.5946)).toBe(true); // Bengaluru
    expect(isValidCoordinate(19.076, 72.8777)).toBe(true); // Mumbai

    // Invalid coordinates
    expect(isValidCoordinate(95, 77)).toBe(false); // Lat > 90
    expect(isValidCoordinate(-95, 77)).toBe(false); // Lat < -90
    expect(isValidCoordinate(28, 190)).toBe(false); // Lng > 180
    expect(isValidCoordinate(28, -190)).toBe(false); // Lng < -180
    expect(isValidCoordinate(0, 0)).toBe(false); // Null Island (0,0)
    expect(isValidCoordinate(NaN, 77)).toBe(false);
    expect(isValidCoordinate(28, NaN)).toBe(false);
  });

  it("validates 6-digit Indian postal codes", () => {
    expect(validateIndianPincode("110001")).toEqual({ valid: true, pincode: "110001" });
    expect(validateIndianPincode("560001")).toEqual({ valid: true, pincode: "560001" });
    expect(validateIndianPincode(" 400001 ")).toEqual({ valid: true, pincode: "400001" });
    expect(validateIndianPincode(null)).toEqual({ valid: true, pincode: null });
    expect(validateIndianPincode(undefined)).toEqual({ valid: true, pincode: null });

    // Invalid PINs
    expect(validateIndianPincode("12345")).toEqual({ valid: false, pincode: null });
    expect(validateIndianPincode("1234567")).toEqual({ valid: false, pincode: null });
    expect(validateIndianPincode("ABC123")).toEqual({ valid: false, pincode: null });
  });
});

describe("deterministic station slug generation", () => {
  it("generates deterministic, URL-friendly slugs incorporating OCM ID", () => {
    const slug1 = generateStationSlug("Tata Power Charging Station", "Delhi", 306983);
    expect(slug1).toBe("tata-power-charging-station-delhi-306983");

    const slug2 = generateStationSlug("Statiq Fast Hub", "Gurugram", 204512);
    expect(slug2).toBe("statiq-fast-hub-gurugram-204512");

    // Determinism test: calling with same arguments produces identical output
    expect(generateStationSlug("Tata Power Charging Station", "Delhi", 306983)).toBe(slug1);

    // Fallbacks when name or location is missing
    const fallbackSlug = generateStationSlug(null, null, 9999);
    expect(fallbackSlug).toBe("charging-station-9999");
  });
});

describe("provider normalization logic", () => {
  it("normalizes connector types into canonical categories", () => {
    expect(normalizeConnectorType("CCS (Type 2)")).toBe("ccs2");
    expect(normalizeConnectorType("IEC 62196-3 Configuration FF")).toBe("ccs2");
    expect(normalizeConnectorType("Combo 2")).toBe("ccs2");
    expect(normalizeConnectorType("Type 2 (Socket Only)")).toBe("type2");
    expect(normalizeConnectorType("Mennekes")).toBe("type2");
    expect(normalizeConnectorType("CHAdeMO")).toBe("chademo");
    expect(normalizeConnectorType("GB/T (DC)")).toBe("gbt");
    expect(normalizeConnectorType("GB/T")).toBe("gbt");
    expect(normalizeConnectorType("Type 1 (J1772)")).toBe("type1");
    expect(normalizeConnectorType("Wall / BS 1363")).toBe("wall");
    expect(normalizeConnectorType("Three Phase")).toBe("wall");
    expect(normalizeConnectorType("Proprietary")).toBe("other");
    expect(normalizeConnectorType(null)).toBe("other");
  });

  it("normalizes station status faithfully without inventing live availability", () => {
    expect(normalizeStationStatus("Operational", true)).toBe("Operational");
    expect(normalizeStationStatus("Plan / Under Construction", false)).toBe("Planned");
    expect(normalizeStationStatus("Temporarily Unavailable", false)).toBe("Not Operational");
    expect(normalizeStationStatus("Not Operational", false)).toBe("Not Operational");
    expect(normalizeStationStatus(null, true)).toBe("Operational");
    expect(normalizeStationStatus(null, false)).toBe("Not Operational");
    expect(normalizeStationStatus(null, null)).toBe("unknown");
  });

  it("normalizes raw OCM POI records into ProviderStation structure", () => {
    const rawOcmPoi = {
      ID: 306983,
      AddressInfo: {
        Title: "Tata Power - Aerocity Charging Hub",
        AddressLine1: "Asset 2, Aerocity Hospitality District",
        Town: "New Delhi",
        StateOrProvince: "Delhi",
        Postcode: "110037",
        Latitude: 28.552,
        Longitude: 77.1215,
      },
      OperatorInfo: {
        ID: 23,
        Title: "Tata Power",
        WebsiteURL: "https://www.tatapower.com",
      },
      StatusType: {
        ID: 50,
        Title: "Operational",
        IsOperational: true,
      },
      UsageType: {
        ID: 1,
        Title: "Public",
      },
      DataProvider: {
        ID: 1,
        Title: "Open Charge Map",
        License: "Creative Commons Attribution 4.0 International",
      },
      DateLastVerified: "2026-03-15T10:00:00Z",
      Connections: [
        {
          ID: 500101,
          ConnectionTypeID: 33,
          ConnectionType: { Title: "CCS (Type 2)" },
          PowerKW: 60,
          Voltage: 400,
          Amps: 150,
          StatusType: { Title: "Operational", IsOperational: true },
          Quantity: 2,
        },
        {
          ID: 500102,
          ConnectionTypeID: 25,
          ConnectionType: { Title: "Type 2 (Socket Only)" },
          PowerKW: 22,
          Voltage: 230,
          Amps: 32,
          StatusType: { Title: "Operational", IsOperational: true },
          Quantity: 1,
        },
      ],
    };

    const normalized = normalizeOpenChargeMapStation(rawOcmPoi);
    expect(normalized).not.toBeNull();
    expect(normalized?.ocmId).toBe(306983);
    expect(normalized?.externalId).toBe("306983");
    expect(normalized?.name).toBe("Tata Power - Aerocity Charging Hub");
    expect(normalized?.latitude).toBe(28.552);
    expect(normalized?.longitude).toBe(77.1215);
    expect(normalized?.city).toBe("New Delhi");
    expect(normalized?.state).toBe("Delhi");
    expect(normalized?.pincode).toBe("110037");
    expect(normalized?.operatorName).toBe("Tata Power");
    expect(normalized?.operatorWebsite).toBe("https://www.tatapower.com");
    expect(normalized?.status).toBe("Operational");
    expect(normalized?.usageType).toBe("Public");
    expect(normalized?.dataProvider).toBe("Open Charge Map");
    expect(normalized?.ocmUrl).toBe("https://openchargemap.org/site/poi/details/306983");
    expect(normalized?.connectors).toHaveLength(2);
    expect(normalized?.connectors[0].ocmConnectionId).toBe(500101);
    expect(normalized?.connectors[0].normalizedType).toBe("ccs2");
    expect(normalized?.connectors[0].powerKw).toBe(60);
    expect(normalized?.connectors[0].quantity).toBe(2);
  });

  it("filters out generic unknown operators from raw POI records", () => {
    const poiWithUnknownOperator = {
      ID: 1001,
      AddressInfo: {
        Title: "Community Charger",
        Latitude: 12.97,
        Longitude: 77.59,
      },
      OperatorInfo: {
        Title: "(Unknown Operator)",
      },
    };

    const normalized = normalizeOpenChargeMapStation(poiWithUnknownOperator);
    expect(normalized?.operatorName).toBeNull();
    expect(normalized?.operatorWebsite).toBeNull();
  });
});


interface MockOperator {
  id: string;
  name: string;
  slug: string;
  website: string | null;
}

interface MockStationRecord {
  id: string;
  ocmId: number;
  slug: string;
  [key: string]: unknown;
}

interface MockConnectorRecord {
  id: string;
  ocmConnectionId: number | null;
  [key: string]: unknown;
}

interface MockSyncLog {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface MockQualityIssue {
  issueType: string;
  severity: string;
  description: string;
  details?: unknown;
}

interface MockDatabaseStores {
  operatorsStore: Map<string, MockOperator>;
  stationsStore: Map<number, MockStationRecord>;
  connectorsStore: Map<number, MockConnectorRecord>;
  syncLogsStore: Map<string, MockSyncLog>;
  dataQualityIssuesStore: MockQualityIssue[];
}

type MockDatabase = {
  select: () => { from: (table: { [key: symbol]: string }) => Promise<unknown[]> };
  insert: (table: { [key: symbol]: string }) => {
    values: (val: Record<string, unknown>) => {
      returning: () => Promise<unknown[]>;
      onConflictDoUpdate: (opts: { set: Record<string, unknown> }) => {
        returning: () => Promise<unknown[]>;
        then: (resolve?: () => void) => Promise<void>;
      };
      then: (resolve?: () => void) => Promise<void>;
    };
  };
  update: () => {
    set: () => {
      where: () => {
        catch: () => Promise<void>;
        then: (resolve?: () => void) => Promise<void>;
      };
    };
  };
  _stores: MockDatabaseStores;
};

describe("ingestion service orchestration and idempotency", () => {
  function createMockDb(): MockDatabase {
    const statesStore: Array<{ id: string; name: string; slug: string; code: string | null }> = [
      { id: "s-1", name: "Delhi", slug: "delhi", code: "DL" },
      { id: "s-2", name: "Karnataka", slug: "karnataka", code: "KA" },
    ];
    const citiesStore: Array<{ id: string; name: string; slug: string }> = [
      { id: "c-1", name: "New Delhi", slug: "new-delhi" },
      { id: "c-2", name: "Bengaluru", slug: "bengaluru" },
    ];
    const cityAliasesStore: Array<{ alias: string; cityId: string }> = [
      { alias: "bangalore", cityId: "c-2" },
    ];

    const operatorsStore: Map<string, MockOperator> = new Map();
    const stationsStore: Map<number, MockStationRecord> = new Map();
    const connectorsStore: Map<number, MockConnectorRecord> = new Map();
    const syncLogsStore: Map<string, MockSyncLog> = new Map();
    const dataQualityIssuesStore: MockQualityIssue[] = [];

    const mockDb: MockDatabase = {
      select: () => ({
        from: (table: { [key: symbol]: string }) => {
          const tableName = table[Symbol.for("drizzle:Name")] || "";
          if (tableName === "states") return Promise.resolve([...statesStore]);
          if (tableName === "cities") return Promise.resolve([...citiesStore]);
          if (tableName === "city_aliases") return Promise.resolve([...cityAliasesStore]);
          if (tableName === "operators") return Promise.resolve(Array.from(operatorsStore.values()));
          if (tableName === "stations") return Promise.resolve(Array.from(stationsStore.values()));
          return Promise.resolve([]);
        },
      }),

      insert: (table: { [key: symbol]: string }) => ({
        values: (val: Record<string, unknown>) => ({
          returning: () => {
            const tableName = table[Symbol.for("drizzle:Name")] || "";
            if (tableName === "sync_logs") {
              const row: MockSyncLog = { id: `sync-${Date.now()}`, status: "running", ...val };
              syncLogsStore.set(row.id, row);
              return Promise.resolve([row]);
            }
            if (tableName === "operators") {
              const row: MockOperator = {
                id: `op-${operatorsStore.size + 1}`,
                name: String(val.name),
                slug: String(val.slug),
                website: (val.website as string) || null,
              };
              operatorsStore.set(row.slug, row);
              return Promise.resolve([row]);
            }
            if (tableName === "stations") {
              const row: MockStationRecord = {
                id: `st-${stationsStore.size + 1}`,
                ocmId: Number(val.ocmId),
                slug: String(val.slug),
                ...val,
              };
              stationsStore.set(Number(val.ocmId), row);
              return Promise.resolve([row]);
            }
            return Promise.resolve([{ id: `gen-${Date.now()}`, ...val }]);
          },
          onConflictDoUpdate: ({ set }: { set: Record<string, unknown> }) => ({
            returning: () => {
              const tableName = table[Symbol.for("drizzle:Name")] || "";
              if (tableName === "operators") {
                const existing = operatorsStore.get(String(val.slug));
                if (existing) {
                  Object.assign(existing, { ...set, id: existing.id });
                  return Promise.resolve([existing]);
                }
                const row: MockOperator = {
                  id: `op-${operatorsStore.size + 1}`,
                  name: String(val.name),
                  slug: String(val.slug),
                  website: (val.website as string) || null,
                };
                operatorsStore.set(row.slug, row);
                return Promise.resolve([row]);
              }
              if (tableName === "stations") {
                const existing = stationsStore.get(Number(val.ocmId));
                if (existing) {
                  Object.assign(existing, {
                    ...set,
                    id: existing.id,
                    ocmId: Number(val.ocmId),
                    slug: existing.slug,
                  });
                  return Promise.resolve([existing]);
                }
                const row: MockStationRecord = {
                  id: `st-${stationsStore.size + 1}`,
                  ocmId: Number(val.ocmId),
                  slug: String(val.slug),
                  ...val,
                };
                stationsStore.set(Number(val.ocmId), row);
                return Promise.resolve([row]);
              }
              return Promise.resolve([{ id: `gen-${Date.now()}`, ...val }]);
            },
            then: (resolve?: () => void) => {
              const tableName = table[Symbol.for("drizzle:Name")] || "";
              if (tableName === "connectors") {
                const connId = val.ocmConnectionId as number | null;
                if (connId !== null && connId !== undefined) {
                  connectorsStore.set(connId, {
                    id: `conn-${connId}`,
                    ocmConnectionId: connId,
                    ...val,
                  });
                }
              }
              resolve?.();
              return Promise.resolve();
            },
          }),
          then: (resolve?: () => void) => {
            const tableName = table[Symbol.for("drizzle:Name")] || "";
            if (tableName === "data_quality_issues") {
              dataQualityIssuesStore.push({
                issueType: String(val.issueType),
                severity: String(val.severity),
                description: String(val.description),
                details: val.details,
              });
            }
            if (tableName === "connectors") {
              const connId = (val.ocmConnectionId as number | null) ?? Date.now();
              connectorsStore.set(connId, {
                id: `conn-${connId}`,
                ocmConnectionId: connId,
                ...val,
              });
            }
            resolve?.();
            return Promise.resolve();
          },
        }),
      }),

      update: () => ({
        set: () => ({
          where: () => ({
            catch: () => Promise.resolve(),
            then: (resolve?: () => void) => {
              resolve?.();
              return Promise.resolve();
            },
          }),
        }),
      }),

      _stores: {
        operatorsStore,
        stationsStore,
        connectorsStore,
        syncLogsStore,
        dataQualityIssuesStore,
      },
    };

    return mockDb;
  }

  it("persists valid stations, operators, connectors, and sync logs correctly", async () => {
    const mockDb = createMockDb();
    const mockStations: ProviderStation[] = [
      {
        externalId: "101",
        ocmId: 101,
        name: "Tata Power Charging Station",
        latitude: 28.61,
        longitude: 77.2,
        address: "Connaught Place, New Delhi",
        city: "New Delhi",
        state: "Delhi",
        district: "New Delhi",
        pincode: "110001",
        operatorName: "Tata Power",
        operatorWebsite: "https://tatapower.com",
        status: "Operational",
        usageType: "Public",
        dataProvider: "Open Charge Map",
        dataLicense: "CC BY 4.0",
        ocmUrl: "https://openchargemap.org/site/poi/details/101",
        lastVerifiedAt: new Date("2026-02-01"),
        connectors: [
          {
            ocmConnectionId: 201,
            type: "CCS (Type 2)",
            normalizedType: "ccs2",
            level: "Level 3",
            powerKw: 60,
            voltage: 400,
            amps: 150,
            status: "Operational",
            quantity: 2,
          },
        ],
      },
    ];

    const mockProvider: ChargingDataProvider = {
      fetchStations: vi.fn().mockResolvedValue(mockStations),
      fetchStation: vi.fn().mockResolvedValue(null),
      healthCheck: vi.fn().mockResolvedValue({ provider: "mock", ok: true }),
    };

    const result = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });

    expect(result.fetched).toBe(1);
    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.operatorsCount).toBe(1);
    expect(result.stationsCount).toBe(1);
    expect(result.connectorsCount).toBe(1);

    expect(mockDb._stores.stationsStore.has(101)).toBe(true);
    expect(mockDb._stores.operatorsStore.has("tata-power")).toBe(true);
    expect(mockDb._stores.connectorsStore.has(201)).toBe(true);
  });

  it("handles repeated sync idempotently without duplicating stations or operators", async () => {
    const mockDb = createMockDb();
    const mockStations: ProviderStation[] = [
      {
        externalId: "101",
        ocmId: 101,
        name: "Tata Power Charging Station",
        latitude: 28.61,
        longitude: 77.2,
        address: "Connaught Place, New Delhi",
        city: "New Delhi",
        state: "Delhi",
        district: "New Delhi",
        pincode: "110001",
        operatorName: "Tata Power",
        operatorWebsite: "https://tatapower.com",
        status: "Operational",
        usageType: "Public",
        dataProvider: "Open Charge Map",
        dataLicense: "CC BY 4.0",
        ocmUrl: "https://openchargemap.org/site/poi/details/101",
        lastVerifiedAt: new Date("2026-02-01"),
        connectors: [
          {
            ocmConnectionId: 201,
            type: "CCS (Type 2)",
            normalizedType: "ccs2",
            level: "Level 3",
            powerKw: 60,
            voltage: 400,
            amps: 150,
            status: "Operational",
            quantity: 2,
          },
        ],
      },
    ];

    const mockProvider: ChargingDataProvider = {
      fetchStations: vi.fn().mockResolvedValue(mockStations),
      fetchStation: vi.fn().mockResolvedValue(null),
      healthCheck: vi.fn().mockResolvedValue({ provider: "mock", ok: true }),
    };

    // Run 1: initial insertion
    const run1 = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });
    expect(run1.created).toBe(1);
    expect(run1.updated).toBe(0);
    expect(mockDb._stores.stationsStore.size).toBe(1);

    // Run 2: repeated sync (should update, not duplicate)
    const run2 = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });
    expect(run2.created).toBe(0);
    expect(run2.updated).toBe(1);
    expect(mockDb._stores.stationsStore.size).toBe(1);
    expect(mockDb._stores.operatorsStore.size).toBe(1);
  });

  it("skips stations with invalid coordinates and records data quality issue", async () => {
    const mockDb = createMockDb();
    const mockStations: ProviderStation[] = [
      {
        externalId: "999",
        ocmId: 999,
        name: "Corrupt Coordinates Station",
        latitude: 999, // INVALID (>90)
        longitude: 77.2,
        address: "Unknown Location",
        city: null,
        state: null,
        district: null,
        pincode: null,
        operatorName: null,
        operatorWebsite: null,
        status: "unknown",
        usageType: null,
        dataProvider: "Open Charge Map",
        dataLicense: null,
        ocmUrl: null,
        lastVerifiedAt: null,
        connectors: [],
      },
    ];

    const mockProvider: ChargingDataProvider = {
      fetchStations: vi.fn().mockResolvedValue(mockStations),
      fetchStation: vi.fn().mockResolvedValue(null),
      healthCheck: vi.fn().mockResolvedValue({ provider: "mock", ok: true }),
    };

    const result = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(mockDb._stores.stationsStore.size).toBe(0);

    const issues = mockDb._stores.dataQualityIssuesStore;
    expect(issues.some((i: MockQualityIssue) => i.issueType === "invalid_coordinates")).toBe(true);
  });

  it("records data quality issue on invalid PIN code while preserving valid station", async () => {
    const mockDb = createMockDb();
    const mockStations: ProviderStation[] = [
      {
        externalId: "102",
        ocmId: 102,
        name: "Valid Station with Bad PIN",
        latitude: 12.97,
        longitude: 77.59,
        address: "MG Road, Bengaluru",
        city: "Bengaluru",
        state: "Karnataka",
        district: "Bengaluru",
        pincode: "12345", // INVALID (5 digits)
        operatorName: "Statiq",
        operatorWebsite: null,
        status: "Operational",
        usageType: "Public",
        dataProvider: "Open Charge Map",
        dataLicense: null,
        ocmUrl: null,
        lastVerifiedAt: null,
        connectors: [],
      },
    ];

    const mockProvider: ChargingDataProvider = {
      fetchStations: vi.fn().mockResolvedValue(mockStations),
      fetchStation: vi.fn().mockResolvedValue(null),
      healthCheck: vi.fn().mockResolvedValue({ provider: "mock", ok: true }),
    };

    const result = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });
    expect(result.created).toBe(1);
    expect(mockDb._stores.stationsStore.size).toBe(1);

    const issues = mockDb._stores.dataQualityIssuesStore;
    expect(issues.some((i: MockQualityIssue) => i.issueType === "invalid_pincode")).toBe(true);
  });

  it("handles individual record failures without failing the entire sync batch", async () => {
    const mockDb = createMockDb();

    // Force an error for station 501
    const originalInsert = mockDb.insert;
    mockDb.insert = (table: { [key: symbol]: string }) => {
      const builder = originalInsert(table);
      const originalValues = builder.values;
      builder.values = (val: Record<string, unknown>) => {
        if (val.ocmId === 501) {
          throw new Error("Simulated database constraint failure for station 501");
        }
        return originalValues(val);
      };
      return builder;
    };

    const mockStations: ProviderStation[] = [
      {
        externalId: "501",
        ocmId: 501,
        name: "Failing Station",
        latitude: 28.6,
        longitude: 77.2,
        address: "Failing road",
        city: null,
        state: null,
        district: null,
        pincode: null,
        operatorName: null,
        operatorWebsite: null,
        status: "Operational",
        usageType: null,
        dataProvider: "Open Charge Map",
        dataLicense: null,
        ocmUrl: null,
        lastVerifiedAt: null,
        connectors: [],
      },
      {
        externalId: "502",
        ocmId: 502,
        name: "Successful Station",
        latitude: 19.07,
        longitude: 72.87,
        address: "Mumbai Central",
        city: null,
        state: null,
        district: null,
        pincode: null,
        operatorName: null,
        operatorWebsite: null,
        status: "Operational",
        usageType: null,
        dataProvider: "Open Charge Map",
        dataLicense: null,
        ocmUrl: null,
        lastVerifiedAt: null,
        connectors: [],
      },
    ];

    const mockProvider: ChargingDataProvider = {
      fetchStations: vi.fn().mockResolvedValue(mockStations),
      fetchStation: vi.fn().mockResolvedValue(null),
      healthCheck: vi.fn().mockResolvedValue({ provider: "mock", ok: true }),
    };

    const result = await ingestStations({
      provider: mockProvider,
      db: mockDb as unknown as ReturnType<typeof getDb>,
    });
    expect(result.fetched).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(mockDb._stores.stationsStore.has(502)).toBe(true);
  });
});
