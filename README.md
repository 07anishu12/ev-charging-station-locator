# FastCharger

FastCharger is an India-wide EV charging discovery platform with a decoupled, high-performance architecture built for reliability, scalability, and technical SEO.

> Find your next charging stop across India with real-time station availability, technical connector specifications, and verified geographical data.

---

## 1. Architectural Boundaries

FastCharger enforces strict boundaries between presentation, business operations, canonical persistence, and background ingestion:

```text
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│  (Next.js App Router, React 19, Tailwind CSS 4, SSR)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP REST / JSON
                            ▼
┌────────────────────────────────────────────────────────┐
│                      BACKEND                           │
│     (Node.js, Hono API, Zod Validation, Drizzle ORM)   │
└───────────────────────────┬────────────────────────────┘
                            │ SQL / PostGIS
                            ▼
┌────────────────────────────────────────────────────────┐
│                     DATABASE                           │
│        (PostgreSQL 16 + PostGIS Spatial Engine)        │
└───────────────────────────▲────────────────────────────┘
                            │ SQL / Ingestion writes
┌───────────────────────────┴────────────────────────────┐
│                      WORKER                            │
│  (Provider Ingestion, Normalization, Scheduled Jobs)   │
└────────────────────────────────────────────────────────┘
```

### Core Invariants:
- **`frontend → HTTP → backend → database`**: The frontend communicates with the backend purely via HTTP. The frontend contains zero database drivers (`pg`, `drizzle-orm`) and zero database connection pools.
- **Frontend Independence**: The frontend builds and renders without requiring `DATABASE_URL`.
- **Worker Isolation**: Ingestion and synchronization workers persist canonical records directly to the database without UI dependencies.
- **Shared Contracts**: `@fastcharger/shared` defines type contracts, Zod schemas, and client wrappers without database or framework couplings.

---

## 2. Directory Layout & Package Responsibilities

```text
fastcharger/
├── frontend/             # Next.js 16 presentation, SSR/SSG pages, maps, SEO
├── backend/              # Standalone Node.js + Hono HTTP REST API (/api/v1/)
├── worker/               # Background data ingestion, sync jobs, and normalization
├── database/             # PostgreSQL + PostGIS schema, Drizzle ORM, migrations
├── storage/              # S3-compatible object storage abstraction (S3/R2/MinIO)
├── shared/               # Shared domain types, Zod contracts, and API client
├── infrastructure/       # Docker Compose setup for PostgreSQL, MongoDB & MinIO
├── docs/                 # Architectural specifications and migration documentation
├── package.json          # Root workspace configuration and scripts
├── tsconfig.base.json    # Base TypeScript configuration
└── README.md             # Project documentation
```

### Workspace Breakdown:
- **`frontend/` (`@fastcharger/frontend`)**: Next.js App Router, React 19, Tailwind CSS 4, Leaflet map client, mobile-responsive UI, metadata, and JSON-LD structured data. Connects to backend via `NEXT_PUBLIC_API_URL`.
- **`backend/` (`@fastcharger/backend`)**: High-performance HTTP server running on Hono. Handles request validation, spatial PostGIS queries (`ST_DWithin`, `ST_Distance`), city/pincode filtering, and standardized REST envelopes.
- **`worker/` (`@fastcharger/worker`)**: Provider ingestion (Open Charge Map), normalization pipelines, and scheduled sync jobs.
- **`database/` (`@fastcharger/database`)**: PostGIS geospatial schemas, Drizzle migrations, connection pool lifecycle, and health checks.
- **`storage/` (`@fastcharger/storage`)**: S3-compatible object storage abstraction supporting AWS S3, Cloudflare R2, MinIO, and hermetic in-memory test drivers.
- **`shared/` (`@fastcharger/shared`)**: Canonical TypeScript interfaces, validation schemas, HTTP client (`FastChargerApiClient`), and geographic reference catalogs.
- **`infrastructure/`**: Local development Docker configuration for PostgreSQL, MongoDB, and MinIO.
- **`docs/`**: Detailed architectural documentation (`docs/architecture.md`), database specifications (`docs/database.md`), and status tracking (`docs/migration-status.md`).

---

## 3. Authoritative Source of Truth: PostgreSQL + PostGIS

FastCharger strictly separates data authority:

> **POSTGRESQL = canonical business data**  
> **POSTGIS = canonical geographic intelligence**

- **PostgreSQL** is authoritative for:
  - `states`, `districts`, `cities`, `localities`, `pincodes`, `city_aliases`
  - `operators`, `stations`, `connectors`
  - `station status`, `verification_status`
  - Upstream provider cross-references (`station_provider_mappings`)
  - Verification state & data quality audit trail (`data_quality_issues`)
  - Synchronisation logs (`sync_logs`) and immutable timestamps
- **PostGIS** (`geography(Point, 4326)`) is authoritative for:
  - Geographic coordinates (latitude, longitude)
  - Geodesic spatial distance metrics
  - Radius-based bounding and filtering (`ST_DWithin`)
  - Sub-millisecond indexed spatial search (`stations_location_gist_idx`, `localities_location_gist_idx`)
- **Non-Authoritative Layers**:
  - Redis: transient cache only; volatile.
  - MongoDB: raw telemetry and payload archival only.
  - Object storage: static media and photos only.
  - Frontend state: ephemeral UI render cache only.
  - Provider API responses: untrusted raw external inputs.

### Station Identity & Multi-Provider De-duplication
Repeated synchronizations across providers (OCM, Kazam, Statiq) never create duplicate stations:
1. **Provider Mapping Match**: Known `(provider_name, provider_station_id)` tuples resolve directly to canonical station records.
2. **Spatial Proximity + Operator/Name Fingerprint**: Stations within a 25-meter radius sharing operator slug or name similarity are reconciled as the same physical charging site.
3. **Deterministic Canonical Slugs**: Generated deterministically using base name, locality/city anchor, and provider ID or coordinate grid hash.

### Data Quality & Anomaly Tracking
Invalid provider data is never silently dropped. Anomalies are recorded in `data_quality_issues`:
- `invalid_coordinates`: Coordinates outside standard boundaries or Null Island `(0,0)`.
- `invalid_pincode`: Malformed non-6-digit PIN codes.
- `missing_city` & `ambiguous_city`: Unresolved or conflicting city assignments.
- `duplicate_provider_record`: Repeated upstream provider records.
- `malformed_connector`: Missing connector type or invalid negative power rating.
- `invalid_status`: Unrecognized operational states.

---

## 4. Flexible Operational & Event Layer: MongoDB

FastCharger introduces MongoDB **strictly for flexible document and operational event workloads**:

> **POSTGRESQL = canonical business data**  
> **MONGODB = flexible events/documents**  
> **REDIS = cache/temporary acceleration**  
> **OBJECT STORAGE = large files/raw payloads**  

### Strict Boundary Rules:
- **MongoDB MAY store**:
  - `ingestion_events`: Sync run lifecycle, batch checkpoints, and provider ingestion metrics.
  - `provider_processing_events`: Raw provider payload transformations, normalization transitions, and rate-limiting notifications.
  - `audit_events`: Administrative modifications, security events, and configuration change records.
  - `data_quality_events`: Historical anomaly event log (coordinate anomalies, PIN code mismatches, connector errors) for trend analysis.
  - `search_analytics_events`: High-volume query telemetry, search filters, zero-result queries, and latency profiling.
  - `operational_events`: Circuit breaker state changes, system health checks, cache drops, and worker job heartbeats.
- **MongoDB MUST NOT store**:
  - Canonical charging stations
  - Canonical cities or districts
  - Canonical pincodes or localities
  - Canonical connectors
  - Canonical geographic hierarchy
- **PostgreSQL truth is NEVER duplicated into MongoDB.**

### Deterministic Event Structure:
Every operational event adheres strictly to the canonical event envelope:
```typescript
interface BaseEvent<TPayload> {
  eventId: string;          // UUID v4 or deterministic event hash
  eventType: string;        // e.g. "search.query_executed", "ingestion.batch_processed"
  timestamp: Date;          // ISO Date
  source: string;           // System emitting event (e.g. "fastcharger-backend")
  correlationId: string;    // Request or job correlation ID for distributed tracing
  entityId?: string | null; // Optional business entity ID reference
  payload: TPayload;        // Flexible document payload
  version: number;          // Schema version (>= 1)
  expiresAt?: Date;         // Optional explicit TTL target
}
```

### High-Volume Retention Policy (TTL Indexes):
High-volume operational events expire automatically via database-side TTL indexes (`expireAfterSeconds` on `timestamp`):
- `operational_events`: **14 days** (1,209,600s) — System health, circuit breakers, cache drops.
- `search_analytics_events`: **30 days** (2,592,000s) — Query telemetry, zero-result analysis.
- `provider_processing_events`: **30 days** (2,592,000s) — Upstream payload diffs, normalization transitions.
- `ingestion_events`: **90 days** (7,776,000s) — Batch progress, sync lifecycle telemetry.
- `data_quality_events`: **180 days** (15,552,000s) — Upstream provider anomaly decay analysis.
- `audit_events`: **365 days** (31,536,000s) — Security, configuration changes, migrations.

### Failure Isolation & Fallback Policy:
- **MongoDB failure NEVER breaks core station discovery or transactional flows.**
- If MongoDB becomes unavailable (offline, network split, timeout):
  1. PostgreSQL-backed APIs continue serving 100% of user traffic without errors or performance penalties.
  2. The event store triggers an explicit `BUFFER_AND_LOG` fallback policy, appending events to an in-memory ring buffer while logging diagnostic warnings.
  3. Analytics or logging failures never turn into user-facing 500 outages.

---

## 5. Object Storage Abstraction (S3 / R2 / MinIO)

FastCharger introduces an S3-compatible Object Storage abstraction for large/raw artifacts:

> **POSTGRESQL = canonical business data**  
> **POSTGIS = canonical geographic intelligence**  
> **MONGODB = flexible events/documents**  
> **REDIS = cache/temporary acceleration**  
> **OBJECT STORAGE = files/raw artifacts**  

### Supported Conceptual Implementations:
- **AWS S3**: Production object storage in AWS environments (`ap-south-1`).
- **Cloudflare R2**: Zero-egress global object storage with custom endpoint integration.
- **MinIO**: Local S3-compatible Docker service for hermetic development and offline CI.
- **Memory**: Ephemeral in-memory test driver for fast unit testing.

### Core Use Cases:
- **Raw Provider Responses**: High-fidelity archival of vendor API responses (Open Charge Map, Kazam, Statiq).
- **Provider Dumps**: Large JSON and CSV station dataset snapshots.
- **Large JSON Payloads**: Intermediate normalization manifests and reconciliation trees.
- **CSV & GeoJSON Exports**: User-requested or scheduled bulk export files.
- **Ingestion Audit Reports**: Per-sync summary reports and anomaly logs.
- **Future Station Media**: User-uploaded station photos and verification proofs.

### Database Division of Responsibility:
- **PostgreSQL stores metadata** via the `object_metadata` table:
  `object_key`, `bucket`, `content_type`, `size_bytes`, `checksum_sha256`, `source`, `provider`, `job_id`, `created_at`, and retention parameters.
- **Large raw files are NEVER stored directly in relational table rows.**

### Uniform Abstraction API:
Applications interact with storage purely through the domain abstraction interface, completely insulated from AWS SDK semantics:
- `putObject(input)`: Uploads buffer or string, computes SHA-256 checksum, sets MIME type and metadata tags.
- `getObject(input)`: Downloads object body as Buffer, validates length and checksum, returns metadata.
- `headObject(input)`: Checks existence, content type, length, and metadata without downloading payload body.
- `deleteObject(input)`: Deletes object from bucket.
- `createSignedUrl(input)`: Generates time-limited presigned URLs for controlled GET or PUT operations.

### Security & Access Control:
- **Private by Default**: Storage buckets are strictly private; public read/write access is disabled.
- **Zero Frontend Credential Exposure**: Storage credentials (`accessKeyId`, `secretAccessKey`) are never exposed to the frontend.
- **Controlled Signed URLs**: When client download is required, the backend or worker issues short-lived presigned URLs (default 15 minutes).
- **Worker Archival Ownership**: The worker package owns raw vendor payload archival (`RawProviderArchivalService`).

---

## 6. Environment Variables

Create `.env.local` in the root workspace or target application:

| Variable | Target | Purpose | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Backend / Database / Worker | PostgreSQL connection string with PostGIS | `postgresql://postgres:postgres@localhost:5432/fastcharger` |
| `MONGODB_URI` | Database / Backend / Worker | MongoDB connection URI for operational events | `mongodb://admin:password@localhost:27017/fastcharger_events?authSource=admin` |
| `STORAGE_PROVIDER` | Storage / Worker / Backend | Object storage implementation (`s3`, `r2`, `minio`, `memory`) | `minio` |
| `STORAGE_ENDPOINT` | Storage / Worker / Backend | Endpoint URL for MinIO or Cloudflare R2 | `http://localhost:9000` |
| `STORAGE_DEFAULT_BUCKET` | Storage / Worker / Backend | Default target bucket for object storage | `fastcharger-raw` |
| `STORAGE_ACCESS_KEY` | Storage / Worker / Backend | Storage access key ID | `minioadmin` |
| `STORAGE_SECRET_KEY` | Storage / Worker / Backend | Storage secret access key | `minioadmin` |
| `STORAGE_FORCE_PATH_STYLE`| Storage / Worker / Backend | Enable path-style S3 URLs (required for MinIO) | `true` |
| `NEXT_PUBLIC_API_URL` | Frontend | URL of backend API for client & SSR fetch | `http://localhost:3001` |
| `NEXT_PUBLIC_SITE_URL` | Frontend | Canonical frontend site URL | `http://localhost:3000` |
| `PORT` | Backend | Port for standalone backend API | `3001` |
| `OPENCHARGEMAP_API_KEY` | Worker | API key for Open Charge Map provider ingestion | (optional for local mock/cache) |

---

## 7. Local Development

### 1. Start Infrastructure (PostgreSQL + PostGIS, MongoDB & MinIO)
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Start Applications

**Start All (Full Stack):**
```bash
npm run dev
```

**Start Backend API Only:**
```bash
cd backend && npm run dev
# Backend API runs at http://localhost:3001/api/v1/health
```

**Start Frontend Only:**
```bash
cd frontend && npm run dev
# Frontend runs at http://localhost:3000
```

---

---

## 6. Durable Worker Ingestion System (`@fastcharger/worker`)

FastCharger provides a production-grade, independent background ingestion pipeline designed for resilience, idempotency, and complete failure isolation:

```text
Provider Adapter (OCM, Kazam, Statiq)
       │
       ▼
1. Raw Archival ────────► Object Storage (S3/R2/MinIO) & PostgreSQL object_metadata
       │
       ▼
2. Validation ──────────► Strict coordinate & ID check (records error to data_quality_issues)
       │                  [Fatal records isolated; batch continues]
       ▼
3. Normalization ───────► Canonical plug types (ccs2, type2, chademo, gbt, wall) & status
       │
       ▼
4. Identity Resolution ─► Multi-tier resolution:
       │                  - Upstream provider mapping (station_provider_mappings)
       │                  - 25m spatial proximity deduplication (isProximityDuplicate)
       │                  - Stable deterministic slug (generateDeterministicStationSlug)
       ▼
5. PostgreSQL/PostGIS ──► Authoritative persistence, spatial point indexing, upsert semantics
       │
       ▼
6. Operational Events ──► MongoEventStore (INGESTION_STARTED, INGESTION_COMPLETED, anomalies)
       │                  [Failure-isolated via BUFFER_AND_LOG]
       ▼
7. Cache Invalidation ──► Invalidate affected Redis keys (stations, cities, pincodes)
```

### Worker Responsibilities:
- **Independent Ingestion Engine**: Orchestrates upstream vendor synchronization completely decoupled from frontend rendering and backend request serving.
- **Authoritative Data Ingestion**: PostGIS + PostgreSQL is the sole authoritative destination for all stations, connectors, operators, and spatial points.
- **Zero Data Loss**: Anomalies, malformed records, and upstream provider discrepancies are persisted in `data_quality_issues` and logged to MongoDB events rather than silently discarded.

### Provider Adapter Boundary (`worker/src/providers/`):
- All vendor-specific query parameters, API keys, HTTP headers, and URL routes are strictly encapsulated inside provider adapters implementing `ProviderAdapter`.
- New vendors (Kazam, Statiq, ChargePoint) can be added without modifying the core 8-stage pipeline.
- **Bounded Exponential Backoff Retries**: Transient failures (HTTP 429 Too Many Requests, HTTP 5xx Server Errors, socket timeouts, network resets) are retried with exponential backoff and jitter (up to 3 retries). Permanent failures (400, 401, 403, 404, unparseable payload) fail fast immediately.

### Validation & Malformed Record Isolation:
- Validates coordinates, 6-digit Indian PIN codes, connector types, operational statuses, and provider identifiers.
- **Batch Resilience**: A fatal validation error on a single record (e.g. invalid latitude/longitude or missing upstream identifier) is isolated, logged as an anomaly, and increments `rejected` without aborting the remaining batch.
- Non-fatal warnings (e.g. 5-digit PIN code, missing operator name) create audit records in `data_quality_issues` while allowing the station record to persist.

### Identity Resolution & Idempotency:
- **Deterministic Multi-Tier Resolution**:
  1. `station_provider_mappings` check on `(provider_name, provider_station_id)` resolves existing station ID.
  2. Direct OCM ID / External ID lookup.
  3. **25-Meter Spatial Proximity Deduplication**: Stations within 25m sharing operator slug or high name similarity are resolved as the same physical charging site, incrementing `duplicates` and updating provider mappings.
  4. **Deterministic Canonical Slugs**: Generated via `generateDeterministicStationSlug()` ensuring URI stability across sync runs.
- **Idempotency Guarantee**: Running the same sync payload repeatedly produces `inserted: 0, updated: N` with zero duplicate stations created.

### Raw Archival & Cache Invalidation:
- **Raw Archival**: Unmodified raw payloads are archived to object storage via `RawProviderArchivalService` and indexed in PostgreSQL's `object_metadata` table.
- **Cache Invalidation**: On successful PostgreSQL persistence, affected Redis cache keys (`stations:all`, `stations:nearby:*`, `city:{slug}`, `state:{slug}`, `pincode:{code}`, `station:{slug}`) are invalidated.
- **Failure Isolation**: If Redis or MongoDB or Object Storage is temporarily unavailable, the core PostgreSQL station ingestion completes successfully without crashing.

### Observability Metrics Contract:
Every ingestion run produces a comprehensive observability report with exact metrics:
```typescript
interface IngestionRunResult {
  runId: string;        // Unique job run identifier (UUID)
  provider: string;     // Provider identifier (e.g. "open-charge-map")
  started: Date;        // Job start timestamp
  completed: Date;      // Job completion timestamp
  received: number;     // Raw records received from provider
  validated: number;    // Records passing validation
  rejected: number;     // Malformed records rejected and isolated
  inserted: number;     // New stations inserted into PostgreSQL
  updated: number;      // Existing stations updated
  duplicates: number;   // Spatial proximity / multi-provider duplicates resolved
  errors: number;       // Unexpected record-level processing errors
  archivedObjectKey?: string | null; // S3/R2/MinIO raw dump location
}
```

### Ingestion Commands & Local Execution:
```bash
# 1. Local Pipeline Dry Run (Runs complete 8-stage pipeline with mock data, no API key required)
npm run sync:dry-run

# 2. Open Charge Map India Synchronization (Requires OPENCHARGEMAP_API_KEY and DATABASE_URL)
npm run sync:india

# 3. Dry-run mode for India sync (Tests connectivity and processes first 10 records)
npx tsx worker/src/jobs/sync-india.ts --dry-run
```

---

## 7. API Architecture & Versioned Contracts (v1)

FastCharger enforces strict, versioned API contracts between frontend and backend to guarantee independent deployment.

- **Current Version**: `v1` (`/api/v1/`)
- **Contract Location**: `shared/contracts/`
- **Schema Engine**: TypeScript + Zod

### Response Envelope
```json
{
  "data": { ... }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "STATION_NOT_FOUND",
    "message": "Station not found",
    "details": { ... }
  }
}
```

### Endpoint Inventory

**Current (v1 Implemented):**
- `GET /health` & `GET /health/db`: Process and PostGIS health checks
- `GET /api/v1/stations`: Paginated stations with city, state, connector, and power filters
- `GET /api/v1/stations/:slug`: Comprehensive station details
- `GET /api/v1/stations/nearby`: PostGIS spatial distance search (`latitude`, `longitude`, `radiusKm`)
- `GET /api/v1/cities`: Paginated catalog of indexed cities
- `GET /api/v1/cities/:slug`: City station catalog and operator breakdown
- `GET /api/v1/pincodes/:pincode`: 6-digit postal code location and nearby charging hubs
- `GET /api/v1/search`: Unified search across stations, cities, operators, and PIN codes

### Backward Compatibility Policy
- **Allowed within v1**: Adding optional response fields, adding optional query parameters, introducing new endpoints under `/api/v1/`.
- **Breaking (Requires `/api/v2/`)**: Removing fields, renaming fields, altering types/units, modifying error/pagination envelope shapes.

---

## 8. Verification & Testing

The repository includes comprehensive unit, integration, spatial, storage, and worker pipeline tests:

```bash
# Run complete test suite (21 test files, 229 tests)
npm test

# Run worker ingestion pipeline tests (12 dedicated tests)
npx vitest run tests/worker-ingestion.test.ts

# Run canonical database ownership tests
npx vitest run tests/canonical-data-ownership.test.ts

# Run object storage abstraction tests
npx vitest run tests/object-storage.test.ts

# Run MongoDB event store tests
npx vitest run tests/mongodb-event-store.test.ts

# Run API contract test suite
npx vitest run tests/contracts.test.ts

# Run backend API integration tests
npx vitest run backend/tests/api.integration.test.ts

# Run frontend build verification (with DATABASE_URL unset)
DATABASE_URL="" npm run build

# Run lint checks
npm run lint
```

---

## 9. Migration Status

- **Prompt 1 (Physical Application Boundaries)**: **IMPLEMENTED**  
  Restructured into `frontend/`, `backend/`, `worker/`, `database/`, `shared/`, `infrastructure/`, `docs/`.
- **Prompt 2 (Backend Extraction)**: **IMPLEMENTED**  
  Standalone Hono HTTP server running at `/api/v1/` with PostGIS queries and full test suite.
- **Prompt 3 (Frontend Decoupling)**: **IMPLEMENTED**  
  Frontend converted to pure presentation consuming HTTP API; zero database dependencies.
- **Prompt 4 (Release Verification & Stabilization)**: **IMPLEMENTED**  
  Typecheck, test suites, offline build verification, and clean architecture boundaries established.
- **Prompt 5 (API Contract System)**: **COMPLETE**  
  Versioned `/api/v1/` contract system established under `shared/contracts/`, shared API client upgraded with validation, backward compatibility policy formalized, and 18 dedicated contract tests added.
- **Prompt 6 — COMPLETE**: **COMPLETE**  
  **PostgreSQL + PostGIS established as canonical authoritative source of truth**. Added canonical tables for `districts`, `localities`, and `station_provider_mappings`. Added `verification_status` to `stations`. Implemented deterministic multi-attribute station identity and de-duplication resolution (`database/src/identity.ts`). Formalized comprehensive anomaly tracking in `data_quality_issues` (`database/src/quality.ts`). Created migration `0003_canonical_postgis_entities.sql` with verified rollback procedures. 18 test suites and 181 tests passing.
- **Prompt 7 — COMPLETE**: **COMPLETE**  
  **Introduced MongoDB strictly for flexible document & operational event workloads**. Configured deterministic event envelope (`BaseEvent`), dedicated collections (`ingestion_events`, `provider_processing_events`, `data_quality_events`, `search_analytics_events`, `operational_events`, `audit_events`), comprehensive index specifications (`eventId` unique, compound `timestamp`+`eventType`, `correlationId`, sparse `entityId`), database-side TTL retention policies (14 to 365 days), and non-disruptive failure isolation with `BUFFER_AND_LOG` fallback. Verified 19 test suites and 199 tests passing.
- **Prompt 8 — COMPLETE**: **COMPLETE**  
  **Introduced S3-Compatible Object Storage Abstraction** (`@fastcharger/storage`). Supports AWS S3, Cloudflare R2, MinIO, and hermetic in-memory test drivers. Decoupled application code from AWS SDK semantics via uniform `putObject()`, `getObject()`, `headObject()`, `deleteObject()`, and `createSignedUrl()` interfaces. Enforced private-by-default buckets, short-lived signed URLs, and worker raw provider archival (`RawProviderArchivalService`). Added PostgreSQL `object_metadata` entity and migration `0004_object_metadata.sql`. Verified 20 test suites and 217 tests passing.
- **Prompt 9 — COMPLETE**: **COMPLETE**  
  **Established Production-Grade Durable Worker Ingestion System** (`@fastcharger/worker`). Implemented 8-stage pipeline: Provider → Raw Archive (S3/R2/MinIO & PostgreSQL `object_metadata`) → Validation (fatal coordinate/ID isolation without breaking batch) → Normalization (canonical plug types & status) → Identity Resolution (provider mappings, 25m spatial proximity deduplication, deterministic slugs) → PostgreSQL/PostGIS persistence (upsert semantics, transactions) → Events (MongoDB operational logging) → Cache Invalidation (affected Redis keys). Added provider adapter boundary with bounded exponential backoff retries for transient 429/5xx errors, dry-run CLI execution (`npm run sync:dry-run`), and complete observability metrics (`runId`, `provider`, `started`, `completed`, `received`, `validated`, `rejected`, `inserted`, `updated`, `duplicates`, `errors`). Verified 21 test suites and 229 tests passing.
- **Prompt 10 — Delhi discrepancy resolved**: **COMPLETE**  
  **Resolved geographic station count discrepancy incident** where Delhi displayed approximately 12–13 stations on maps despite 60–70 stations existing in source and database records. Executed forensic pipeline trace across all stages (Provider → Raw Payload → Ingestion Normalization → Deduplication → PostgreSQL → PostGIS → Backend Repository → API → Frontend Map). Identified and fixed compound root causes: (1) unseeded city aliases and missing canonical resolution during worker ingestion causing `city_id = NULL` on 26 Delhi stations; (2) missing `operatorSlug` in proximity indexing causing false deduplication merges of co-located stations; (3) strict SQL filter `cities.slug = 'delhi'` omitting unlinked/aliased stations; (4) spatial 10km radius circle excluding peripheral metropolitan EV clusters (Aerocity, Saket, Dwarka, Rohini); and (5) frontend city page passing `pageSize: 20` directly to Leaflet `<MapView>`, in which only 12–13 stations fell inside the default viewport (with 12 fast chargers >= 50kW). Implemented generic, non-special-cased fixes across ingestion, database seeds, repository queries, spatial boundaries, and frontend map rendering (verified across Delhi, Bengaluru, Mumbai, Kolkata, Chennai). Created forensic incident report in `docs/incidents/delhi-station-count-discrepancy.md` and added comprehensive regression suite in `tests/delhi-station-discrepancy.test.ts`. 22 test suites and 237 tests passing.

---

## 10. Independent Deployment

Each application tier is independently deployable:
- **Frontend**: Deployable to edge/serverless runtimes (Vercel, Cloudflare Pages, Netlify) with only `NEXT_PUBLIC_API_URL`. Does not require VPC peering or database credentials.
- **Backend API**: Deployable to container platforms (AWS ECS, Fly.io, Railway, Google Cloud Run) inside a private VPC with `DATABASE_URL`.
- **Worker**: Deployable as independent scheduled jobs or background containers.
- **Database**: Managed PostgreSQL + PostGIS (AWS RDS, Supabase, Neon).

