import { MongoError } from "mongodb";
import { MongoClientManager, getMongoClientManager } from "./client";
import { validateEventEnvelope } from "./schema";
import {
  BaseEvent,
  EventBatchWriteResult,
  EventCollectionName,
  EventFallbackPolicy,
  EventQueryOptions,
  EventWriteResult,
} from "./types";

export class MalformedEventError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = "MalformedEventError";
    this.validationErrors = validationErrors;
  }
}

export interface EventStoreConfig {
  clientManager?: MongoClientManager;
  defaultFallbackPolicy?: EventFallbackPolicy;
  maxBufferCapacity?: number;
  inMemoryDb?: Map<string, BaseEvent[]>;
}

export class MongoEventStore {
  private clientManager: MongoClientManager;
  private defaultFallbackPolicy: EventFallbackPolicy;
  private fallbackBuffer: BaseEvent[] = [];
  private maxBufferCapacity: number;
  private inMemoryDb: Map<string, BaseEvent[]> | null = null;

  constructor(config: EventStoreConfig = {}) {
    this.clientManager = config.clientManager || getMongoClientManager();
    this.defaultFallbackPolicy = config.defaultFallbackPolicy || "BUFFER_AND_LOG";
    this.maxBufferCapacity = config.maxBufferCapacity || 500;
    if (config.inMemoryDb) {
      this.inMemoryDb = config.inMemoryDb;
    }
  }

  public isAvailable(): boolean {
    if (this.inMemoryDb) return true;
    return this.clientManager.isAvailable();
  }

  public getFallbackBuffer(): BaseEvent[] {
    return [...this.fallbackBuffer];
  }

  public clearFallbackBuffer(): void {
    this.fallbackBuffer = [];
  }

  /**
   * Records a single event into the specified collection with deterministic schema validation,
   * duplicate eventId idempotency, and non-blocking failure isolation.
   */
  public async recordEvent(
    collectionName: EventCollectionName,
    rawEvent: unknown,
    options: { fallbackPolicy?: EventFallbackPolicy } = {},
  ): Promise<EventWriteResult> {
    const policy = options.fallbackPolicy || this.defaultFallbackPolicy;

    // 1. Deterministic validation
    const validation = validateEventEnvelope(rawEvent);
    if (!validation.valid || !validation.sanitized) {
      if (policy === "THROW") {
        throw new MalformedEventError(
          `Event failed schema validation: ${validation.errors?.join(", ")}`,
          validation.errors,
        );
      }
      const rawCandidate = rawEvent as Record<string, unknown> | null | undefined;
      return {
        success: false,
        eventId: typeof rawCandidate?.eventId === "string" ? rawCandidate.eventId : "unknown",
        error: `Malformed event: ${validation.errors?.join(", ")}`,
      };
    }

    const event = validation.sanitized;

    // 2. Write to in-memory store if configured (for test/offline mode)
    if (this.inMemoryDb) {
      return this.recordToInMemory(collectionName, event);
    }

    // 3. Write to MongoDB if available
    const db = this.clientManager.getDb();
    if (!db || !this.clientManager.isAvailable()) {
      return this.handleFallback(event, "MongoDB connection unavailable", policy);
    }

    try {
      const collection = db.collection(collectionName);
      await collection.insertOne(event as unknown as import("mongodb").OptionalUnlessRequiredId<import("mongodb").Document>);
      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (err: unknown) {
      // Check for duplicate key error (E11000) on eventId
      if (err instanceof MongoError && err.code === 11000) {
        return {
          success: true,
          eventId: event.eventId,
          duplicateIgnored: true,
        };
      }

      // If network / server error, invoke failure isolation fallback
      return this.handleFallback(
        event,
        err instanceof Error ? err.message : String(err),
        policy,
      );
    }
  }

  /**
   * Records a batch of events with failure isolation.
   */
  public async recordBatch(
    collectionName: EventCollectionName,
    rawEvents: unknown[],
    options: { fallbackPolicy?: EventFallbackPolicy } = {},
  ): Promise<EventBatchWriteResult> {
    let recorded = 0;
    let buffered = 0;
    let duplicates = 0;
    let failed = 0;

    for (const raw of rawEvents) {
      const result = await this.recordEvent(collectionName, raw, options);
      if (result.success) {
        if (result.duplicateIgnored) {
          duplicates++;
        } else {
          recorded++;
        }
      } else if (result.buffered) {
        buffered++;
      } else {
        failed++;
      }
    }

    return {
      total: rawEvents.length,
      recorded,
      buffered,
      duplicates,
      failed,
    };
  }

  /**
   * Queries events with filtering by eventType, correlationId, entityId, and time ranges.
   */
  public async queryEvents(
    collectionName: EventCollectionName,
    options: EventQueryOptions = {},
  ): Promise<BaseEvent[]> {
    if (this.inMemoryDb) {
      return this.queryInMemory(collectionName, options);
    }

    const db = this.clientManager.getDb();
    if (!db || !this.clientManager.isAvailable()) {
      return [];
    }

    const filter: Record<string, unknown> = {};

    if (options.eventType) {
      filter.eventType = options.eventType;
    }
    if (options.correlationId) {
      filter.correlationId = options.correlationId;
    }
    if (options.entityId) {
      filter.entityId = options.entityId;
    }
    if (options.source) {
      filter.source = options.source;
    }

    if (options.fromTimestamp || options.toTimestamp) {
      filter.timestamp = {};
      if (options.fromTimestamp) {
        (filter.timestamp as Record<string, unknown>).$gte = options.fromTimestamp;
      }
      if (options.toTimestamp) {
        (filter.timestamp as Record<string, unknown>).$lte = options.toTimestamp;
      }
    }

    const limit = options.limit || 50;
    const skip = options.offset || 0;

    try {
      const collection = db.collection(collectionName);
      const cursor = collection
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const docs = await cursor.toArray();
      return docs as unknown as BaseEvent[];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // In-Memory Simulation Helpers (Used in isolated unit tests & offline mode)
  // -------------------------------------------------------------------------
  private recordToInMemory(
    collectionName: string,
    event: BaseEvent,
  ): EventWriteResult {
    if (!this.inMemoryDb) {
      return { success: false, eventId: event.eventId, error: "In-memory DB uninitialized" };
    }

    let list = this.inMemoryDb.get(collectionName);
    if (!list) {
      list = [];
      this.inMemoryDb.set(collectionName, list);
    }

    // Duplicate check on eventId
    if (list.some((existing) => existing.eventId === event.eventId)) {
      return {
        success: true,
        eventId: event.eventId,
        duplicateIgnored: true,
      };
    }

    list.push(event);
    return { success: true, eventId: event.eventId };
  }

  private queryInMemory(
    collectionName: string,
    options: EventQueryOptions,
  ): BaseEvent[] {
    if (!this.inMemoryDb) return [];
    const list = this.inMemoryDb.get(collectionName) || [];

    const filtered = list.filter((item) => {
      if (options.eventType && item.eventType !== options.eventType) return false;
      if (options.correlationId && item.correlationId !== options.correlationId) return false;
      if (options.entityId && item.entityId !== options.entityId) return false;
      if (options.source && item.source !== options.source) return false;
      if (options.fromTimestamp && item.timestamp < options.fromTimestamp) return false;
      if (options.toTimestamp && item.timestamp > options.toTimestamp) return false;
      return true;
    });

    // Sort descending by timestamp
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options.offset || 0;
    const limit = options.limit || 50;
    return filtered.slice(offset, offset + limit);
  }

  // -------------------------------------------------------------------------
  // Fallback Isolation Handling
  // -------------------------------------------------------------------------
  private handleFallback(
    event: BaseEvent,
    reason: string,
    policy: EventFallbackPolicy,
  ): EventWriteResult {
    if (policy === "THROW") {
      throw new Error(`MongoDB Event Write Failed: ${reason}`);
    }

    if (policy === "BUFFER_AND_LOG") {
      if (this.fallbackBuffer.length >= this.maxBufferCapacity) {
        this.fallbackBuffer.shift(); // Evict oldest
      }
      this.fallbackBuffer.push(event);

      return {
        success: false,
        eventId: event.eventId,
        buffered: true,
        error: reason,
      };
    }

    // SILENT_DROP
    return {
      success: false,
      eventId: event.eventId,
      error: reason,
    };
  }
}

let globalEventStore: MongoEventStore | null = null;

export function getEventStore(): MongoEventStore {
  if (!globalEventStore) {
    globalEventStore = new MongoEventStore();
  }
  return globalEventStore;
}

export function createInMemoryEventStore(): MongoEventStore {
  return new MongoEventStore({ inMemoryDb: new Map() });
}
