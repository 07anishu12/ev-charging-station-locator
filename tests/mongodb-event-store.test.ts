import { describe, expect, it } from "vitest";

import {
  COLLECTION_SPECIFICATIONS,
  createInMemoryEventStore,
  EVENT_COLLECTIONS,
  EVENT_TYPES,
  isEventExpired,
  MalformedEventError,
  MongoClientManager,
  MongoEventStore,
  RETENTION_POLICIES,
  validateEventEnvelope,
} from "@fastcharger/database";
import { SearchService } from "../backend/src/services/search.service";

describe("MongoDB Flexible Operational Event Layer", () => {
  describe("Event Schema & Deterministic Envelope Validation", () => {
    it("validates a fully-formed event envelope", () => {
      const validEvent = {
        eventId: "evt-001",
        eventType: EVENT_TYPES.INGESTION_STARTED,
        timestamp: new Date("2026-10-04T12:00:00Z"),
        source: "fastcharger-worker",
        correlationId: "sync-run-456",
        entityId: "provider-ocm-in",
        payload: {
          provider: "open-charge-map",
          country: "IN",
          maxResults: 5000,
        },
        version: 1,
      };

      const result = validateEventEnvelope(validEvent);
      expect(result.valid).toBe(true);
      expect(result.sanitized?.eventId).toBe("evt-001");
      expect(result.sanitized?.eventType).toBe(EVENT_TYPES.INGESTION_STARTED);
      expect(result.sanitized?.version).toBe(1);
    });

    it("accepts ISO string timestamp and normalizes to Date object", () => {
      const eventWithIso = {
        eventId: "evt-002",
        eventType: EVENT_TYPES.SEARCH_QUERY_EXECUTED,
        timestamp: "2026-10-04T12:30:00.000Z",
        source: "fastcharger-backend",
        correlationId: "req-789",
        payload: { query: "Koramangala", resultCount: 14 },
        version: 1,
      };

      const result = validateEventEnvelope(eventWithIso);
      expect(result.valid).toBe(true);
      expect(result.sanitized?.timestamp).toBeInstanceOf(Date);
      expect(result.sanitized?.timestamp.toISOString()).toBe("2026-10-04T12:30:00.000Z");
    });

    it("rejects malformed events missing eventId or eventType", () => {
      const missingId = {
        eventType: EVENT_TYPES.SYSTEM_STARTUP,
        timestamp: new Date(),
        source: "backend",
        correlationId: "corr-1",
        payload: {},
        version: 1,
      };

      const missingType = {
        eventId: "evt-123",
        timestamp: new Date(),
        source: "backend",
        correlationId: "corr-1",
        payload: {},
        version: 1,
      };

      const res1 = validateEventEnvelope(missingId);
      const res2 = validateEventEnvelope(missingType);

      expect(res1.valid).toBe(false);
      expect(res1.errors?.some((e) => e.includes("eventId"))).toBe(true);

      expect(res2.valid).toBe(false);
      expect(res2.errors?.some((e) => e.includes("eventType"))).toBe(true);
    });

    it("rejects malformed events with invalid versions (< 1 or non-integers)", () => {
      const invalidVersion = {
        eventId: "evt-version-bad",
        eventType: EVENT_TYPES.DATABASE_HEALTH_CHECK,
        timestamp: new Date(),
        source: "backend",
        correlationId: "corr-1",
        payload: { status: "ok" },
        version: 0,
      };

      const res = validateEventEnvelope(invalidVersion);
      expect(res.valid).toBe(false);
      expect(res.errors?.some((e) => e.includes("version"))).toBe(true);
    });

    it("rejects malformed events with non-object payloads", () => {
      const arrayPayload = {
        eventId: "evt-payload-bad",
        eventType: EVENT_TYPES.CACHE_INVALIDATION,
        timestamp: new Date(),
        source: "backend",
        correlationId: "corr-1",
        payload: ["not", "an", "object"],
        version: 1,
      };

      const res = validateEventEnvelope(arrayPayload);
      expect(res.valid).toBe(false);
      expect(res.errors?.some((e) => e.includes("payload"))).toBe(true);
    });
  });

  describe("Collection Index Specifications & Explicit Access Patterns", () => {
    it("defines explicit collection specs with dedicated access patterns", () => {
      const collections = Object.keys(COLLECTION_SPECIFICATIONS);
      expect(collections).toContain(EVENT_COLLECTIONS.INGESTION_EVENTS);
      expect(collections).toContain(EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS);
      expect(collections).toContain(EVENT_COLLECTIONS.DATA_QUALITY_EVENTS);
      expect(collections).toContain(EVENT_COLLECTIONS.SEARCH_ANALYTICS_EVENTS);
      expect(collections).toContain(EVENT_COLLECTIONS.OPERATIONAL_EVENTS);
      expect(collections).toContain(EVENT_COLLECTIONS.AUDIT_EVENTS);

      for (const collName of collections) {
        const spec = COLLECTION_SPECIFICATIONS[collName as keyof typeof COLLECTION_SPECIFICATIONS];
        expect(spec.accessPatterns.length).toBeGreaterThan(0);
        expect(spec.retentionSeconds).toBeGreaterThan(0);
        expect(spec.indexes.length).toBeGreaterThanOrEqual(4);
      }
    });

    it("enforces unique eventId index on all event collections", () => {
      for (const spec of Object.values(COLLECTION_SPECIFICATIONS)) {
        const uniqueIdIdx = spec.indexes.find(
          (idx) => idx.keys.eventId === 1 && idx.options.unique === true,
        );
        expect(uniqueIdIdx).toBeDefined();
        expect(uniqueIdIdx?.options.name).toBe("idx_event_id_unique");
      }
    });

    it("enforces compound time-series index (timestamp -1, eventType 1) on all collections", () => {
      for (const spec of Object.values(COLLECTION_SPECIFICATIONS)) {
        const timeIdx = spec.indexes.find(
          (idx) => idx.keys.timestamp === -1 && idx.keys.eventType === 1,
        );
        expect(timeIdx).toBeDefined();
        expect(timeIdx?.options.name).toBe("idx_timestamp_event_type");
      }
    });

    it("enforces correlationId indexing for cross-service workflow tracing", () => {
      for (const spec of Object.values(COLLECTION_SPECIFICATIONS)) {
        const corrIdx = spec.indexes.find((idx) => idx.keys.correlationId === 1);
        expect(corrIdx).toBeDefined();
        expect(corrIdx?.options.name).toBe("idx_correlation_id");
      }
    });
  });

  describe("High-Volume Retention Policies & TTL Indexes", () => {
    it("configures appropriate TTL retention periods for each workload", () => {
      // Operational events: 14 days
      expect(RETENTION_POLICIES.OPERATIONAL_EVENTS).toBe(14 * 86400);

      // Search analytics: 30 days
      expect(RETENTION_POLICIES.SEARCH_ANALYTICS_EVENTS).toBe(30 * 86400);

      // Provider processing: 30 days
      expect(RETENTION_POLICIES.PROVIDER_PROCESSING_EVENTS).toBe(30 * 86400);

      // Ingestion events: 90 days
      expect(RETENTION_POLICIES.INGESTION_EVENTS).toBe(90 * 86400);

      // Data quality anomaly history: 180 days
      expect(RETENTION_POLICIES.DATA_QUALITY_EVENTS).toBe(180 * 86400);

      // Audit logs: 365 days
      expect(RETENTION_POLICIES.AUDIT_EVENTS).toBe(365 * 86400);
    });

    it("attaches TTL expireAfterSeconds index matching the retention policy to every collection", () => {
      for (const spec of Object.values(COLLECTION_SPECIFICATIONS)) {
        const ttlIdx = spec.indexes.find(
          (idx) => idx.keys.timestamp === 1 && idx.options.expireAfterSeconds !== undefined,
        );
        expect(ttlIdx).toBeDefined();
        expect(ttlIdx?.options.expireAfterSeconds).toBe(spec.retentionSeconds);
      }
    });

    it("calculates document expiration accurately via isEventExpired helper", () => {
      const now = new Date("2026-10-04T12:00:00Z");

      // Event from 10 days ago (within 14 days operational retention)
      const freshOperational = {
        eventId: "fresh-op",
        eventType: EVENT_TYPES.SYSTEM_STARTUP,
        timestamp: new Date("2026-09-24T12:00:00Z"),
        source: "backend",
        correlationId: "boot-1",
        payload: {},
        version: 1,
      };
      expect(isEventExpired(freshOperational, EVENT_COLLECTIONS.OPERATIONAL_EVENTS, now)).toBe(false);

      // Event from 20 days ago (expired under 14 days operational retention)
      const oldOperational = {
        eventId: "old-op",
        eventType: EVENT_TYPES.SYSTEM_STARTUP,
        timestamp: new Date("2026-09-14T12:00:00Z"),
        source: "backend",
        correlationId: "boot-0",
        payload: {},
        version: 1,
      };
      expect(isEventExpired(oldOperational, EVENT_COLLECTIONS.OPERATIONAL_EVENTS, now)).toBe(true);

      // Same 20-day old event is NOT expired under 30 days search analytics retention
      expect(isEventExpired(oldOperational, EVENT_COLLECTIONS.SEARCH_ANALYTICS_EVENTS, now)).toBe(false);
    });
  });

  describe("Event Writes, Retrieval & Duplicate Handling", () => {
    it("writes and retrieves events by correlationId and eventType", async () => {
      const store = createInMemoryEventStore();

      const eventA = {
        eventId: "evt-write-1",
        eventType: EVENT_TYPES.INGESTION_BATCH_PROCESSED,
        timestamp: new Date("2026-10-04T10:00:00Z"),
        source: "worker",
        correlationId: "sync-run-100",
        payload: { batchIndex: 1, stationCount: 50 },
        version: 1,
      };

      const eventB = {
        eventId: "evt-write-2",
        eventType: EVENT_TYPES.INGESTION_COMPLETED,
        timestamp: new Date("2026-10-04T10:05:00Z"),
        source: "worker",
        correlationId: "sync-run-100",
        payload: { totalStations: 50, durationMs: 300000 },
        version: 1,
      };

      const writeResA = await store.recordEvent(EVENT_COLLECTIONS.INGESTION_EVENTS, eventA);
      const writeResB = await store.recordEvent(EVENT_COLLECTIONS.INGESTION_EVENTS, eventB);

      expect(writeResA.success).toBe(true);
      expect(writeResB.success).toBe(true);

      // Query by correlationId
      const queried = await store.queryEvents(EVENT_COLLECTIONS.INGESTION_EVENTS, {
        correlationId: "sync-run-100",
      });

      expect(queried.length).toBe(2);
      expect(queried[0].eventId).toBe("evt-write-2"); // Descending order
      expect(queried[1].eventId).toBe("evt-write-1");

      // Query by specific eventType
      const completedEvents = await store.queryEvents(EVENT_COLLECTIONS.INGESTION_EVENTS, {
        eventType: EVENT_TYPES.INGESTION_COMPLETED,
      });
      expect(completedEvents.length).toBe(1);
      expect(completedEvents[0].eventId).toBe("evt-write-2");
    });

    it("handles duplicate event writes idempotently without failing", async () => {
      const store = createInMemoryEventStore();

      const event = {
        eventId: "duplicate-test-id",
        eventType: EVENT_TYPES.PROVIDER_STATION_NORMALIZED,
        timestamp: new Date(),
        source: "worker",
        correlationId: "batch-1",
        payload: { providerStationId: 101 },
        version: 1,
      };

      const firstWrite = await store.recordEvent(EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS, event);
      expect(firstWrite.success).toBe(true);
      expect(firstWrite.duplicateIgnored).toBeUndefined();

      // Second write with identical eventId
      const secondWrite = await store.recordEvent(EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS, event);
      expect(secondWrite.success).toBe(true);
      expect(secondWrite.duplicateIgnored).toBe(true);

      // Total records in collection must remain 1
      const docs = await store.queryEvents(EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS, {
        correlationId: "batch-1",
      });
      expect(docs.length).toBe(1);
    });

    it("processes batch writes and detects duplicates within batches", async () => {
      const store = createInMemoryEventStore();

      const batch = [
        {
          eventId: "batch-evt-1",
          eventType: EVENT_TYPES.DATA_QUALITY_ANOMALY_RECORDED,
          timestamp: new Date(),
          source: "worker",
          correlationId: "audit-run",
          payload: { issueType: "invalid_coordinates" },
          version: 1,
        },
        {
          eventId: "batch-evt-2",
          eventType: EVENT_TYPES.DATA_QUALITY_ANOMALY_RECORDED,
          timestamp: new Date(),
          source: "worker",
          correlationId: "audit-run",
          payload: { issueType: "invalid_pincode" },
          version: 1,
        },
        {
          eventId: "batch-evt-1", // Duplicate within batch
          eventType: EVENT_TYPES.DATA_QUALITY_ANOMALY_RECORDED,
          timestamp: new Date(),
          source: "worker",
          correlationId: "audit-run",
          payload: { issueType: "invalid_coordinates" },
          version: 1,
        },
      ];

      const batchResult = await store.recordBatch(EVENT_COLLECTIONS.DATA_QUALITY_EVENTS, batch);
      expect(batchResult.total).toBe(3);
      expect(batchResult.recorded).toBe(2);
      expect(batchResult.duplicates).toBe(1);
      expect(batchResult.failed).toBe(0);
    });

    it("throws MalformedEventError when configured with THROW fallback policy", async () => {
      const store = createInMemoryEventStore();

      await expect(
        store.recordEvent(
          EVENT_COLLECTIONS.OPERATIONAL_EVENTS,
          { malformed: true },
          { fallbackPolicy: "THROW" },
        ),
      ).rejects.toThrow(MalformedEventError);
    });
  });

  describe("Failure Isolation & Non-Disruptive Degradation", () => {
    it("buffers events safely when MongoDB is offline under BUFFER_AND_LOG policy", async () => {
      // Client manager with dummy offline URI that is disconnected
      const offlineClientManager = new MongoClientManager({
        uri: "mongodb://non-existent-host:27017/offline_db",
      });

      const store = new MongoEventStore({
        clientManager: offlineClientManager,
        defaultFallbackPolicy: "BUFFER_AND_LOG",
      });

      expect(store.isAvailable()).toBe(false);

      const event = {
        eventId: "fallback-evt-1",
        eventType: EVENT_TYPES.SYSTEM_STARTUP,
        timestamp: new Date(),
        source: "backend",
        correlationId: "test-corr",
        payload: { message: "Test fallback write" },
        version: 1,
      };

      // Recording must NOT throw an uncaught exception
      const result = await store.recordEvent(EVENT_COLLECTIONS.OPERATIONAL_EVENTS, event);

      expect(result.success).toBe(false);
      expect(result.buffered).toBe(true);
      expect(result.error).toContain("MongoDB connection unavailable");

      // Verify event is preserved in fallback buffer
      const buffer = store.getFallbackBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].eventId).toBe("fallback-evt-1");
    });

    it("guarantees search discovery succeeds even when MongoDB is unavailable", async () => {
      // Mock search repository that returns canonical mock items
      const mockSearchRepo = {
        searchEntities: async () => [
          {
            id: "station-uuid-1",
            title: "Ather Fast Charger Indiranagar",
            subtitle: "Bengaluru, Karnataka",
            type: "station" as const,
            url: "/station/ather-fast-charger-indiranagar",
          },
        ],
      };

      // Offline event store that fails event writes
      const offlineEventStore = new MongoEventStore({
        clientManager: new MongoClientManager({ uri: "mongodb://offline:27017" }),
        defaultFallbackPolicy: "BUFFER_AND_LOG",
      });

      const searchService = new SearchService(
        mockSearchRepo as unknown as import("../backend/src/repositories/search.repository").ISearchRepository,
        undefined,
        offlineEventStore,
      );

      // Executing search when MongoDB is dead MUST succeed normally
      const result = await searchService.search({ q: "Ather", page: 1, pageSize: 10 });

      expect(result).toBeDefined();
      expect(result.searchType).toBe("text");
      expect(result.resultCount).toBe(1);
      expect(result.items?.[0]?.title).toBe("Ather Fast Charger Indiranagar");

      // Event was captured by fallback buffer instead of failing search
      const buffer = offlineEventStore.getFallbackBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0].eventType).toBe(EVENT_TYPES.SEARCH_QUERY_EXECUTED);
      expect((buffer[0].payload as Record<string, unknown>).query).toBe("Ather");
    });
  });
});
