import {
  BaseEvent,
  EVENT_COLLECTIONS,
  EventCollectionName,
} from "./types";

export interface IndexSpecification {
  keys: Record<string, 1 | -1 | "text">;
  options: {
    name: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
  };
}

export interface CollectionSpecification {
  collectionName: EventCollectionName;
  description: string;
  accessPatterns: string[];
  retentionSeconds: number;
  indexes: IndexSpecification[];
}

// ---------------------------------------------------------------------------
// Retention Policies (TTL)
// ---------------------------------------------------------------------------
export const RETENTION_POLICIES = {
  OPERATIONAL_EVENTS: 14 * 86400, // 14 days: High-volume system health, circuit breaker, cache logs
  SEARCH_ANALYTICS_EVENTS: 30 * 86400, // 30 days: Query logs, zero results, clickstream telemetry
  PROVIDER_PROCESSING_EVENTS: 30 * 86400, // 30 days: Raw payload diffs, normalization transitions
  INGESTION_EVENTS: 90 * 86400, // 90 days: Ingestion runs, provider sync batch performance
  DATA_QUALITY_EVENTS: 180 * 86400, // 180 days: Historical data quality anomaly records for trend analysis
  AUDIT_EVENTS: 365 * 86400, // 365 days: Security, schema migrations, and admin modifications
} as const;

export const COLLECTION_SPECIFICATIONS: Record<EventCollectionName, CollectionSpecification> = {
  [EVENT_COLLECTIONS.OPERATIONAL_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.OPERATIONAL_EVENTS,
    description: "System health events, circuit breaker triggers, cache drops, and fallback logs.",
    accessPatterns: [
      "Query by eventType and timestamp descending for incident post-mortems",
      "Query by correlationId across worker and backend processes",
    ],
    retentionSeconds: RETENTION_POLICIES.OPERATIONAL_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.OPERATIONAL_EVENTS } },
    ],
  },

  [EVENT_COLLECTIONS.SEARCH_ANALYTICS_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.SEARCH_ANALYTICS_EVENTS,
    description: "Search discovery analytics, zero-result terms, and latency monitoring.",
    accessPatterns: [
      "Aggregate zero-result search terms within time window",
      "Query popular queries and geographic discovery clusters",
    ],
    retentionSeconds: RETENTION_POLICIES.SEARCH_ANALYTICS_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { "payload.query": 1 }, options: { name: "idx_payload_query", sparse: true } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.SEARCH_ANALYTICS_EVENTS } },
    ],
  },

  [EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.PROVIDER_PROCESSING_EVENTS,
    description: "Provider API responses, rate-limiting notifications, and station payload transformation steps.",
    accessPatterns: [
      "Filter by provider station ID (entityId) and correlationId to audit normalization",
      "Time-window monitoring of provider rate limit events",
    ],
    retentionSeconds: RETENTION_POLICIES.PROVIDER_PROCESSING_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { entityId: 1 }, options: { name: "idx_entity_id", sparse: true } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.PROVIDER_PROCESSING_EVENTS } },
    ],
  },

  [EVENT_COLLECTIONS.INGESTION_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.INGESTION_EVENTS,
    description: "Ingestion pipeline batches, lifecycle metrics, and sync run summaries.",
    accessPatterns: [
      "Query by correlationId (syncLogId) for end-to-end ingestion telemetry",
      "Fetch recent failed ingestion events by timestamp",
    ],
    retentionSeconds: RETENTION_POLICIES.INGESTION_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.INGESTION_EVENTS } },
    ],
  },

  [EVENT_COLLECTIONS.DATA_QUALITY_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.DATA_QUALITY_EVENTS,
    description: "Data quality anomaly event trail tracking malformed coordinates, missing cities, and invalid plugs.",
    accessPatterns: [
      "Analyze historical anomaly frequency by entityId and issueType",
      "Time-series monitoring of upstream provider data decay",
    ],
    retentionSeconds: RETENTION_POLICIES.DATA_QUALITY_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { entityId: 1 }, options: { name: "idx_entity_id", sparse: true } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { "payload.issueType": 1 }, options: { name: "idx_payload_issue_type", sparse: true } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.DATA_QUALITY_EVENTS } },
    ],
  },

  [EVENT_COLLECTIONS.AUDIT_EVENTS]: {
    collectionName: EVENT_COLLECTIONS.AUDIT_EVENTS,
    description: "Administrative actions, configuration mutations, and schema migration events.",
    accessPatterns: [
      "Audit trail lookup by entityId, user/actor, and timestamp range",
    ],
    retentionSeconds: RETENTION_POLICIES.AUDIT_EVENTS,
    indexes: [
      { keys: { eventId: 1 }, options: { name: "idx_event_id_unique", unique: true } },
      { keys: { timestamp: -1, eventType: 1 }, options: { name: "idx_timestamp_event_type" } },
      { keys: { correlationId: 1 }, options: { name: "idx_correlation_id" } },
      { keys: { entityId: 1 }, options: { name: "idx_entity_id", sparse: true } },
      { keys: { timestamp: 1 }, options: { name: "idx_ttl_retention", expireAfterSeconds: RETENTION_POLICIES.AUDIT_EVENTS } },
    ],
  },
};

/**
 * Validates an event against the deterministic event envelope structure:
 * - eventId: non-empty string
 * - eventType: non-empty string
 * - timestamp: valid Date object or parseable ISO string
 * - source: non-empty string
 * - correlationId: non-empty string
 * - payload: non-null object
 * - version: positive integer (>= 1)
 */
export function validateEventEnvelope(event: unknown): {
  valid: boolean;
  errors?: string[];
  sanitized?: BaseEvent;
} {
  const errors: string[] = [];

  if (!event || typeof event !== "object") {
    return { valid: false, errors: ["Event must be a non-null object."] };
  }

  const candidate = event as Record<string, unknown>;

  if (typeof candidate.eventId !== "string" || candidate.eventId.trim().length === 0) {
    errors.push("Missing or invalid 'eventId': must be a non-empty string.");
  }

  if (typeof candidate.eventType !== "string" || candidate.eventType.trim().length === 0) {
    errors.push("Missing or invalid 'eventType': must be a non-empty string.");
  }

  let timestampDate: Date | null = null;
  if (candidate.timestamp instanceof Date && !isNaN(candidate.timestamp.getTime())) {
    timestampDate = candidate.timestamp;
  } else if (typeof candidate.timestamp === "string" || typeof candidate.timestamp === "number") {
    const parsed = new Date(candidate.timestamp);
    if (!isNaN(parsed.getTime())) {
      timestampDate = parsed;
    } else {
      errors.push("Invalid 'timestamp': cannot parse into a valid Date.");
    }
  } else {
    errors.push("Missing or invalid 'timestamp': must be a Date or parseable date string.");
  }

  if (typeof candidate.source !== "string" || candidate.source.trim().length === 0) {
    errors.push("Missing or invalid 'source': must be a non-empty string.");
  }

  if (typeof candidate.correlationId !== "string" || candidate.correlationId.trim().length === 0) {
    errors.push("Missing or invalid 'correlationId': must be a non-empty string.");
  }

  if (!candidate.payload || typeof candidate.payload !== "object" || Array.isArray(candidate.payload)) {
    errors.push("Missing or invalid 'payload': must be a key-value object.");
  }

  if (typeof candidate.version !== "number" || !Number.isInteger(candidate.version) || candidate.version < 1) {
    errors.push("Missing or invalid 'version': must be a positive integer >= 1.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const sanitized: BaseEvent = {
    eventId: candidate.eventId as string,
    eventType: candidate.eventType as string,
    timestamp: timestampDate!,
    source: candidate.source as string,
    correlationId: candidate.correlationId as string,
    entityId: (candidate.entityId as string | null) ?? null,
    payload: candidate.payload as Record<string, unknown>,
    version: candidate.version as number,
    expiresAt: candidate.expiresAt instanceof Date ? candidate.expiresAt : undefined,
  };

  return { valid: true, sanitized };
}

/**
 * Calculates whether an event document has expired according to its collection TTL retention rule.
 */
export function isEventExpired(
  event: BaseEvent,
  collectionName: EventCollectionName,
  now: Date = new Date(),
): boolean {
  const spec = COLLECTION_SPECIFICATIONS[collectionName];
  if (!spec) return false;

  const eventTime = event.timestamp.getTime();
  const ttlMs = spec.retentionSeconds * 1000;
  return now.getTime() - eventTime > ttlMs;
}
