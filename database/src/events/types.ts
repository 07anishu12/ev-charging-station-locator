/**
 * FastCharger Operational & Flexible Document Event Layer
 *
 * RULES:
 * - POSTGRESQL = canonical business data
 * - MONGODB = flexible events/documents
 * - REDIS = cache/temporary acceleration
 * - OBJECT STORAGE = large files/raw payloads
 *
 * MONGODB MUST NOT STORE:
 * - canonical stations, cities, pincodes, connectors, or geographic hierarchy.
 */

export interface BaseEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  correlationId: string;
  entityId?: string | null;
  payload: TPayload;
  version: number;
  expiresAt?: Date;
}

export const EVENT_COLLECTIONS = {
  INGESTION_EVENTS: "ingestion_events",
  PROVIDER_PROCESSING_EVENTS: "provider_processing_events",
  AUDIT_EVENTS: "audit_events",
  DATA_QUALITY_EVENTS: "data_quality_events",
  SEARCH_ANALYTICS_EVENTS: "search_analytics_events",
  OPERATIONAL_EVENTS: "operational_events",
} as const;

export type EventCollectionName =
  (typeof EVENT_COLLECTIONS)[keyof typeof EVENT_COLLECTIONS];

export const EVENT_TYPES = {
  // Ingestion Events
  INGESTION_STARTED: "ingestion.started",
  INGESTION_BATCH_PROCESSED: "ingestion.batch_processed",
  INGESTION_COMPLETED: "ingestion.completed",
  INGESTION_FAILED: "ingestion.failed",

  // Provider Processing Events
  PROVIDER_FETCH_INITIATED: "provider.fetch_initiated",
  PROVIDER_PAYLOAD_RECEIVED: "provider.payload_received",
  PROVIDER_STATION_NORMALIZED: "provider.station_normalized",
  PROVIDER_RATE_LIMITED: "provider.rate_limited",

  // Data Quality Events
  DATA_QUALITY_ANOMALY_RECORDED: "data_quality.anomaly_recorded",
  DATA_QUALITY_BATCH_AUDITED: "data_quality.batch_audited",

  // Search Analytics Events
  SEARCH_QUERY_EXECUTED: "search.query_executed",
  SEARCH_ZERO_RESULTS: "search.zero_results",
  SEARCH_NEARBY_QUERIED: "search.nearby_queried",

  // Operational Events
  SYSTEM_STARTUP: "operational.system_startup",
  CIRCUIT_BREAKER_TRIPPED: "operational.circuit_breaker_tripped",
  CACHE_INVALIDATION: "operational.cache_invalidation",
  DATABASE_HEALTH_CHECK: "operational.database_health_check",
  MONGO_FALLBACK_TRIGGERED: "operational.mongo_fallback_triggered",

  // Audit Events
  SCHEMA_MIGRATION_EXECUTED: "audit.schema_migration_executed",
  ADMIN_CONFIGURATION_CHANGED: "audit.admin_configuration_changed",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type EventFallbackPolicy = "BUFFER_AND_LOG" | "SILENT_DROP" | "THROW";

export interface EventWriteResult {
  success: boolean;
  eventId: string;
  buffered?: boolean;
  duplicateIgnored?: boolean;
  error?: string;
}

export interface EventBatchWriteResult {
  total: number;
  recorded: number;
  buffered: number;
  duplicates: number;
  failed: number;
}

export interface EventQueryOptions {
  eventType?: string;
  correlationId?: string;
  entityId?: string;
  source?: string;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
  offset?: number;
}
