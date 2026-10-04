# Migration Status & Technical Roadmap

## Migration Status Summary

| Area | Status | Description |
|---|---|---|
| **Physical App Boundaries** | **IMPLEMENTED** | Monorepo layout with `frontend/`, `backend/`, `worker/`, `database/`, `shared/`, `infrastructure/`, and `docs/`. Root `tsconfig.base.json` and package paths configured. |
| **Backend Extraction** | **IMPLEMENTED** | Standalone Hono HTTP server running at `/api/v1/`. Includes routes for `/stations`, `/stations/nearby`, `/stations/:id`, `/cities`, `/cities/:slug`, `/pincodes/:pincode`, and `/search`. Spatial PostGIS queries and full unit/integration test coverage (25 integration tests). |
| **Frontend Decoupling** | **IMPLEMENTED** | Frontend migrated to consume backend via HTTP (`FastChargerApiClient`). 0 database imports (`pg`, `drizzle-orm`) in frontend. Builds completely offline with `DATABASE_URL=""`. |
| **Shared Contracts & Domain** | **IMPLEMENTED** | `@fastcharger/shared` provides canonical domain types, Zod schemas, HTTP client, and geographic catalogs. |
| **Worker Boundary** | **IMPLEMENTED** | `@fastcharger/worker` directory initialized with ingestion, normalization, and job runner abstractions. |
| **Database Boundary** | **IMPLEMENTED** | `@fastcharger/database` encapsulates Drizzle ORM schema, migrations, connection pool, and health checks. |
| **Infrastructure** | **IMPLEMENTED** | Docker Compose setup for PostgreSQL 16 with PostGIS 3.4. |
| **Prompt 5: API Contract System** | **COMPLETE** | Established versioned v1 contract layer under `shared/contracts/` (`common`, `errors`, `pagination`, `geographic`, `station`, `city`, `locality`, `pincode`, `search`). Deduplicated validation schemas, strengthened `FastChargerApiClient`, enforced backward compatibility rules, and added 18 dedicated contract tests. |
| **Prompt 6 — COMPLETE** | **COMPLETE** | **Established PostgreSQL + PostGIS as the authoritative source of truth**. Added canonical tables for `districts`, `localities`, and `station_provider_mappings`. Added `verification_status` to `stations`. Implemented deterministic multi-attribute station identity and de-duplication resolution (`database/src/identity.ts`). Formalized comprehensive anomaly tracking in `data_quality_issues` (`database/src/quality.ts`). Created migration `0003_canonical_postgis_entities.sql` with verified rollback procedures. 18 test suites and 181 tests passing. |
| **Prompt 7 — COMPLETE** | **COMPLETE** | **Introduced MongoDB strictly for flexible document & operational event workloads**. Configured deterministic event envelope (`BaseEvent`), dedicated collections (`ingestion_events`, `provider_processing_events`, `data_quality_events`, `search_analytics_events`, `operational_events`, `audit_events`), comprehensive index specifications (`eventId` unique, compound `timestamp`+`eventType`, `correlationId`, sparse `entityId`), database-side TTL retention policies (14 to 365 days), and non-disruptive failure isolation with `BUFFER_AND_LOG` fallback. Verified 19 test suites and 199 tests passing. |
| **Prompt 8 — COMPLETE** | **COMPLETE** | **Introduced S3-Compatible Object Storage Abstraction** (`@fastcharger/storage`). Supports AWS S3, Cloudflare R2, MinIO, and hermetic in-memory test drivers. Decoupled application code from AWS SDK semantics via uniform `putObject()`, `getObject()`, `headObject()`, `deleteObject()`, and `createSignedUrl()` interfaces. Enforced private-by-default buckets, short-lived signed URLs, and worker raw provider archival (`RawProviderArchivalService`). Added PostgreSQL `object_metadata` entity and migration `0004_object_metadata.sql`. Verified 20 test suites and 217 tests passing. |

---

## Technical Debt & Compatibility Layers

1. **Root Next.js vs `frontend/` App**:
   - The root workspace retains Next.js page mappings to ensure backward compatibility with root test suites and existing CI pipelines.
   - `frontend/` is an independent package with its own `next.config.ts`, `package.json`, and pure presentation routes.
2. **Backward-compatible Root API**:
   - The root Next.js server still retains `/app/api` endpoints for legacy test coverage, but production frontend components strictly call the HTTP client (`NEXT_PUBLIC_API_URL` or fallback).
