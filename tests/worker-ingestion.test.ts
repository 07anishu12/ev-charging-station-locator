import { describe, expect, it } from "vitest";
import {
  OpenChargeMapProvider,
  retryWithBackoff,
  PermanentError,
  type ProviderAdapter,
} from "@fastcharger/worker";
import {
  ingestStations,
  type IngestionRunResult,
} from "../worker/src/ingestion/ingest-stations";
import {
  InMemoryCacheInvalidator,
  buildInvalidationKeys,
} from "../worker/src/cache/cache-invalidator";
import { MemoryObjectStorageClient, RawProviderArchivalService } from "@fastcharger/storage";
import type { ProviderStation, ChargingDataProvider } from "@fastcharger/shared";
import type { getDb } from "@fastcharger/database";

// ---------------------------------------------------------------------------
// Mock In-Memory Database for Pipeline Testing
// ---------------------------------------------------------------------------
interface MockStoreState {
  states: Array<{ id: string; name: string; slug: string; code: string | null }>;
  cities: Array<{ id: string; name: string; slug: string }>;
  cityAliases: Array<{ alias: string; cityId: string }>;
  operators: Map<string, { id: string; name: string; slug: string; website?: string | null }>;
  stations: Map<string, Record<string, unknown>>;
  stationProviderMappings: Map<string, Record<string, unknown>>;
  connectors: Map<string, Record<string, unknown>>;
  dataQualityIssues: Array<Record<string, unknown>>;
  objectMetadata: Map<string, Record<string, unknown>>;
  syncLogs: Map<string, Record<string, unknown>>;
}

function createMockDatabase() {
  const state: MockStoreState = {
    states: [
      { id: "state-dl", name: "Delhi", slug: "delhi", code: "DL" },
      { id: "state-ka", name: "Karnataka", slug: "karnataka", code: "KA" },
      { id: "state-mh", name: "Maharashtra", slug: "maharashtra", code: "MH" },
    ],
    cities: [
      { id: "city-delhi", name: "New Delhi", slug: "new-delhi" },
      { id: "city-blr", name: "Bengaluru", slug: "bengaluru" },
      { id: "city-mum", name: "Mumbai", slug: "mumbai" },
    ],
    cityAliases: [{ alias: "bangalore", cityId: "city-blr" }],
    operators: new Map(),
    stations: new Map(),
    stationProviderMappings: new Map(),
    connectors: new Map(),
    dataQualityIssues: [],
    objectMetadata: new Map(),
    syncLogs: new Map(),
  };

  let snapshotBeforeTrx: string | null = null;

  const mockDb = {
    _state: state,

    select: () => ({
      from: (table: { [key: symbol]: string }) => {
        const name = table[Symbol.for("drizzle:Name")] || "";
        if (name === "states") return Promise.resolve([...state.states]);
        if (name === "cities") return Promise.resolve([...state.cities]);
        if (name === "city_aliases") return Promise.resolve([...state.cityAliases]);
        if (name === "operators") return Promise.resolve(Array.from(state.operators.values()));
        if (name === "stations") return Promise.resolve(Array.from(state.stations.values()));
        if (name === "station_provider_mappings")
          return Promise.resolve(Array.from(state.stationProviderMappings.values()));
        return Promise.resolve([]);
      },
    }),

    insert: (table: { [key: symbol]: string }) => ({
      values: (val: Record<string, unknown>) => {
        const name = table[Symbol.for("drizzle:Name")] || "";
        return {
          returning: () => {
            const id = (val.id as string) || `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const row = { ...val, id };

            if (name === "sync_logs") {
              state.syncLogs.set(id, row);
            } else if (name === "operators") {
              state.operators.set(String(val.slug), {
                id,
                name: String(val.name),
                slug: String(val.slug),
                website: (val.website as string) || null,
              });
            } else if (name === "stations") {
              state.stations.set(id, row);
            }
            return Promise.resolve([row]);
          },
          onConflictDoUpdate: (opts: { set: Record<string, unknown> }) => {
            const execute = () => {
              if (name === "station_provider_mappings") {
                const key = `${val.providerName}:${val.providerStationId}`;
                state.stationProviderMappings.set(key, { ...val });
              } else if (name === "connectors") {
                const key = String(val.ocmConnectionId ?? Math.random());
                state.connectors.set(key, { ...val });
              } else if (name === "object_metadata") {
                state.objectMetadata.set(String(val.objectKey), { ...val });
              }
            };

            return {
              returning: () => {
                execute();
                if (name === "operators") {
                  const slug = String(val.slug);
                  const existing = state.operators.get(slug) || {
                    id: `op-${Date.now()}`,
                    name: String(val.name),
                    slug,
                  };
                  Object.assign(existing, opts.set);
                  state.operators.set(slug, existing);
                  return Promise.resolve([existing]);
                }
                if (name === "stations") {
                  const id = (val.id as string) || `st-${Date.now()}`;
                  const existing = state.stations.get(id) || { id, ...val };
                  Object.assign(existing, opts.set);
                  state.stations.set(id, existing);
                  return Promise.resolve([existing]);
                }
                return Promise.resolve([{ id: `gen-${Date.now()}`, ...val }]);
              },
              catch: (fn?: (err: unknown) => unknown) => {
                execute();
                return Promise.resolve().catch(fn ?? (() => {}));
              },
              then: (resolve?: () => void) => {
                execute();
                resolve?.();
                return Promise.resolve();
              },
            };
          },
          then: (resolve?: () => void) => {
            if (name === "data_quality_issues") {
              state.dataQualityIssues.push({ ...val });
            } else if (name === "station_provider_mappings") {
              const key = `${val.providerName}:${val.providerStationId}`;
              state.stationProviderMappings.set(key, { ...val });
            } else if (name === "connectors") {
              const key = String(val.ocmConnectionId ?? Math.random());
              state.connectors.set(key, { ...val });
            }
            resolve?.();
            return Promise.resolve();
          },
        };
      },
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

    transaction: async (cb: (tx: unknown) => Promise<void>) => {
      // Snapshot state for rollback simulation
      snapshotBeforeTrx = JSON.stringify({
        operators: Array.from(state.operators.entries()),
        stations: Array.from(state.stations.entries()),
        mappings: Array.from(state.stationProviderMappings.entries()),
      });

      try {
        await cb(mockDb);
      } catch (err) {
        // Rollback snapshot
        if (snapshotBeforeTrx) {
          const parsed = JSON.parse(snapshotBeforeTrx);
          state.operators = new Map(parsed.operators);
          state.stations = new Map(parsed.stations);
          state.stationProviderMappings = new Map(parsed.mappings);
        }
        throw err;
      } finally {
        snapshotBeforeTrx = null;
      }
    },
  };

  return mockDb;
}

// ---------------------------------------------------------------------------
// Unit Tests
// ---------------------------------------------------------------------------
describe("Worker Ingestion Pipeline", () => {
  describe("1. Retry Mechanism with Exponential Backoff", () => {
    it("retries on transient HTTP 429 and 5xx errors and succeeds upon recovery", async () => {
      let attempts = 0;
      const transientOp = async () => {
        attempts++;
        if (attempts === 1) {
          const err = new Error("Rate limit exceeded");
          Object.assign(err, { status: 429 });
          throw err;
        }
        if (attempts === 2) {
          const err = new Error("Bad Gateway");
          Object.assign(err, { status: 502 });
          throw err;
        }
        return "SUCCESS_DATA";
      };

      const result = await retryWithBackoff(transientOp, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result).toBe("SUCCESS_DATA");
      expect(attempts).toBe(3);
    });

    it("fails fast immediately on permanent errors without retrying", async () => {
      let attempts = 0;
      const permanentOp = async () => {
        attempts++;
        const err = new PermanentError("Unauthorized API Key");
        throw err;
      };

      await expect(
        retryWithBackoff(permanentOp, {
          maxRetries: 5,
          initialDelayMs: 10,
        }),
      ).rejects.toThrow("Unauthorized API Key");

      expect(attempts).toBe(1); // Exactly 1 attempt, zero retries
    });

    it("fails fast on HTTP 400 Bad Request client errors", async () => {
      let attempts = 0;
      const clientErrorOp = async () => {
        attempts++;
        const err = new Error("Malformed Query");
        Object.assign(err, { status: 400 });
        throw err;
      };

      await expect(
        retryWithBackoff(clientErrorOp, { maxRetries: 3, initialDelayMs: 10 }),
      ).rejects.toThrow("Malformed Query");

      expect(attempts).toBe(1);
    });
  });

  describe("2. Provider Adapter Boundary", () => {
    it("encapsulates raw fetching, normalization, and validation", async () => {
      const adapter = new OpenChargeMapProvider({
        apiKey: "test-api-key",
      });

      expect(adapter.providerName).toBe("open-charge-map");
      expect(typeof adapter.fetchRawStations).toBe("function");
      expect(typeof adapter.normalizeRawStation).toBe("function");
      expect(typeof adapter.validateRawRecord).toBe("function");

      const validRaw = {
        ID: 1001,
        AddressInfo: {
          Title: "Test Station",
          Latitude: 28.61,
          Longitude: 77.21,
          Town: "New Delhi",
        },
      };

      const valResult = adapter.validateRawRecord(validRaw);
      expect(valResult.valid).toBe(true);
      expect(valResult.fatal).toBe(false);

      const invalidRaw = {
        ID: 1002,
        AddressInfo: {
          Title: "Bad Coords Station",
          Latitude: 999.0, // Invalid lat
          Longitude: 77.21,
        },
      };
      const invalidResult = adapter.validateRawRecord(invalidRaw);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.fatal).toBe(true);
    });
  });

  describe("3. Validation & Malformed Record Isolation", () => {
    it("isolates malformed records with invalid coordinates without aborting the batch", async () => {
      const mockDb = createMockDatabase();
      const mockStations: ProviderStation[] = [
        {
          externalId: "val-1",
          ocmId: 10001,
          name: "Invalid Lat Station",
          latitude: 999.0, // FATAL INVALID
          longitude: 77.2,
          address: "Somewhere",
          city: "New Delhi",
          state: "Delhi",
          district: "New Delhi",
          pincode: "110001",
          operatorName: "Tata Power",
          operatorWebsite: null,
          status: "Operational",
          usageType: "Public",
          dataProvider: "Open Charge Map",
          dataLicense: null,
          ocmUrl: null,
          lastVerifiedAt: null,
          connectors: [],
        },
        {
          externalId: "val-2",
          ocmId: 10002,
          name: "Valid Station",
          latitude: 28.61,
          longitude: 77.21,
          address: "Connaught Place",
          city: "New Delhi",
          state: "Delhi",
          district: "New Delhi",
          pincode: "110001",
          operatorName: "Tata Power",
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
        fetchStations: async () => mockStations,
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      const result = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      expect(result.received).toBe(2);
      expect(result.rejected).toBe(1); // 1 skipped due to invalid coordinates
      expect(result.validated).toBe(1);
      expect(result.inserted).toBe(1); // Valid station inserted
      expect(mockDb._state.stations.size).toBe(1);
      expect(
        mockDb._state.dataQualityIssues.some((i) => i.issueType === "invalid_coordinates"),
      ).toBe(true);
    });

    it("records warning issue for malformed PIN code while continuing station persistence", async () => {
      const mockDb = createMockDatabase();
      const mockStations: ProviderStation[] = [
        {
          externalId: "pin-1",
          ocmId: 20001,
          name: "Bad PIN Station",
          latitude: 12.97,
          longitude: 77.59,
          address: "MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          district: "Bengaluru",
          pincode: "5600", // INVALID PIN (4 digits)
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
        fetchStations: async () => mockStations,
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      const result = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      expect(result.received).toBe(1);
      expect(result.rejected).toBe(0); // Not rejected
      expect(result.inserted).toBe(1); // Successfully inserted
      expect(mockDb._state.stations.size).toBe(1);
      expect(mockDb._state.dataQualityIssues.some((i) => i.issueType === "invalid_pincode")).toBe(true);
    });
  });

  describe("4. Identity Resolution & Idempotency", () => {
    it("resolves repeated ingestion idempotently without duplicate insertions", async () => {
      const mockDb = createMockDatabase();
      const mockStations: ProviderStation[] = [
        {
          externalId: "idemp-1",
          ocmId: 30001,
          name: "Tata Power Hub",
          latitude: 28.62,
          longitude: 77.22,
          address: "Connaught Place",
          city: "New Delhi",
          state: "Delhi",
          district: "New Delhi",
          pincode: "110001",
          operatorName: "Tata Power",
          operatorWebsite: null,
          status: "Operational",
          usageType: "Public",
          dataProvider: "Open Charge Map",
          dataLicense: null,
          ocmUrl: null,
          lastVerifiedAt: null,
          connectors: [
            {
              ocmConnectionId: 40001,
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
        fetchStations: async () => mockStations,
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      // Run 1: Initial Insert
      const run1 = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      expect(run1.inserted).toBe(1);
      expect(run1.updated).toBe(0);
      expect(mockDb._state.stations.size).toBe(1);

      // Run 2: Repeated Ingestion
      const run2 = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      expect(run2.inserted).toBe(0);
      expect(run2.updated).toBe(1);
      expect(mockDb._state.stations.size).toBe(1); // Exact same 1 station
    });

    it("resolves spatial proximity duplicates within 25 meters", async () => {
      const mockDb = createMockDatabase();
      // Candidate 1
      const stationA = {
        id: "st-existing-1",
        ocmId: 50001,
        externalId: "ext-50001",
        slug: "tata-power-station-a-50001",
        name: "Tata Power Charging Station",
        latitude: 28.6139,
        longitude: 77.209,
        operatorId: "op-tata",
      };
      mockDb._state.stations.set(stationA.id, stationA);

      // Ingest candidate B located ~11 meters away with same operator
      const mockStations: ProviderStation[] = [
        {
          externalId: "ext-50002",
          ocmId: 50002,
          name: "Tata Power Charging Station CP",
          latitude: 28.614, // ~11m delta
          longitude: 77.209,
          address: "CP Block B",
          city: "New Delhi",
          state: "Delhi",
          district: "New Delhi",
          pincode: "110001",
          operatorName: "Tata Power",
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
        fetchStations: async () => mockStations,
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      const result = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      expect(result.duplicates).toBe(1); // Detected as proximity duplicate
      expect(result.updated).toBe(1);
      expect(result.inserted).toBe(0);
      expect(mockDb._state.stations.size).toBe(1); // Kept existing station
    });
  });

  describe("5. Raw Archival to Object Storage", () => {
    it("archives raw provider payloads to object storage and writes metadata row", async () => {
      const mockDb = createMockDatabase();
      const storageClient = new MemoryObjectStorageClient("test-fastcharger-raw");
      const archivalService = new RawProviderArchivalService(storageClient);

      const rawStations = [
        {
          ID: 70001,
          AddressInfo: {
            Title: "Archival Test Station",
            Latitude: 19.07,
            Longitude: 72.87,
          },
        },
      ];

      const adapter: ProviderAdapter = {
        providerName: "test-archival-provider",
        fetchRawStations: async () => ({
          provider: "test-archival-provider",
          data: rawStations,
          receivedAt: new Date(),
          recordCount: 1,
        }),
        normalizeRawStation: (raw: unknown) => {
          const item = raw as {
            ID: number;
            AddressInfo: { Title: string; Latitude: number; Longitude: number };
          };
          return {
            externalId: String(item.ID),
            ocmId: item.ID,
            name: item.AddressInfo.Title,
            latitude: item.AddressInfo.Latitude,
            longitude: item.AddressInfo.Longitude,
            address: "Mumbai",
            city: "Mumbai",
            state: "Maharashtra",
            district: "Mumbai",
            pincode: "400001",
            operatorName: null,
            operatorWebsite: null,
            status: "Operational",
            usageType: "Public",
            dataProvider: "Test",
            dataLicense: null,
            ocmUrl: null,
            lastVerifiedAt: null,
            connectors: [],
          };
        },
        fetchStations: async () => [],
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "test", ok: true }),
      };

      const result = await ingestStations({
        provider: adapter,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        archivalService,
      });

      expect(result.archivedObjectKey).toBeDefined();
      expect(result.archivedObjectKey).toContain("providers/test-archival-provider/");

      // Verify object exists in object storage
      const storedObj = await storageClient.getObject({ key: result.archivedObjectKey! });
      const parsedBody = JSON.parse(storedObj.body.toString("utf-8"));
      expect(parsedBody).toHaveLength(1);
      expect(parsedBody[0].ID).toBe(70001);

      // Verify PostgreSQL object_metadata record
      expect(mockDb._state.objectMetadata.has(result.archivedObjectKey!)).toBe(true);
    });
  });

  describe("6. Cache Invalidation", () => {
    it("invalidates affected keys for updated stations, cities, and pincodes", async () => {
      const keys = buildInvalidationKeys({
        stationSlugs: ["tata-power-delhi-101"],
        citySlugs: ["new-delhi"],
        stateSlugs: ["delhi"],
        pincodes: ["110001"],
      });

      expect(keys).toContain("stations:all");
      expect(keys).toContain("station:tata-power-delhi-101");
      expect(keys).toContain("city:new-delhi");
      expect(keys).toContain("city:new-delhi:stations");
      expect(keys).toContain("state:delhi");
      expect(keys).toContain("pincode:110001");

      const invalidator = new InMemoryCacheInvalidator();
      const res = await invalidator.invalidate({
        stationSlugs: ["tata-power-delhi-101"],
        citySlugs: ["new-delhi"],
      });

      expect(res.success).toBe(true);
      expect(invalidator.invalidatedKeysHistory).toHaveLength(1);
    });
  });

  describe("7. Observability Contract", () => {
    it("produces all required observability metrics on completion", async () => {
      const mockDb = createMockDatabase();
      const mockProvider: ChargingDataProvider = {
        fetchStations: async () => [
          {
            externalId: "obs-1",
            ocmId: 80001,
            name: "Observability Station",
            latitude: 28.61,
            longitude: 77.21,
            address: "Delhi",
            city: "New Delhi",
            state: "Delhi",
            district: "New Delhi",
            pincode: "110001",
            operatorName: "Tata Power",
            operatorWebsite: null,
            status: "Operational",
            usageType: "Public",
            dataProvider: "Open Charge Map",
            dataLicense: null,
            ocmUrl: null,
            lastVerifiedAt: null,
            connectors: [],
          },
        ],
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      const result: IngestionRunResult = await ingestStations({
        provider: mockProvider,
        db: mockDb as unknown as ReturnType<typeof getDb>,
        skipRawArchive: true,
      });

      // Verify exact keys required by prompt
      expect(typeof result.runId).toBe("string");
      expect(result.provider).toBe("open-charge-map");
      expect(result.started instanceof Date).toBe(true);
      expect(result.completed instanceof Date).toBe(true);
      expect(typeof result.received).toBe("number");
      expect(typeof result.validated).toBe("number");
      expect(typeof result.rejected).toBe("number");
      expect(typeof result.inserted).toBe("number");
      expect(typeof result.updated).toBe("number");
      expect(typeof result.duplicates).toBe("number");
      expect(typeof result.errors).toBe("number");

      expect(result.received).toBe(1);
      expect(result.validated).toBe(1);
      expect(result.rejected).toBe(0);
      expect(result.inserted).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toBe(0);
    });
  });

  describe("8. Database Transaction Rollback", () => {
    it("rolls back database mutations when fatal error occurs in transaction block", async () => {
      const mockDb = createMockDatabase();

      // Seed an initial station
      mockDb._state.stations.set("initial-1", { id: "initial-1", name: "Initial Station" });

      const failingProvider: ChargingDataProvider = {
        fetchStations: async () => {
          return [
            {
              externalId: "fail-1",
              ocmId: 90001,
              name: "Failing Transaction Station",
              latitude: 28.61,
              longitude: 77.21,
              address: "Delhi",
              city: "New Delhi",
              state: "Delhi",
              district: "New Delhi",
              pincode: "110001",
              operatorName: "Tata Power",
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
        },
        fetchStation: async () => null,
        healthCheck: async () => ({ provider: "mock", ok: true }),
      };

      // Force fatal crash during processing inside transaction
      const originalInsert = mockDb.insert;
      let callCount = 0;
      mockDb.insert = (table: { [key: symbol]: string }) => {
        const name = table[Symbol.for("drizzle:Name")] || "";
        if (name === "stations") {
          callCount++;
          if (callCount > 0) {
            throw new Error("Simulated fatal database crash in transaction");
          }
        }
        return originalInsert(table);
      };

      await expect(
        ingestStations({
          provider: failingProvider,
          db: mockDb as unknown as ReturnType<typeof getDb>,
          useTransaction: true,
          skipRawArchive: true,
        }),
      ).rejects.toThrow("Simulated fatal database crash in transaction");

      // Verify rollback preserved only the initial station
      expect(mockDb._state.stations.size).toBe(1);
      expect(mockDb._state.stations.has("initial-1")).toBe(true);
    });
  });
});
