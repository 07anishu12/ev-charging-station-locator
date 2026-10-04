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
├── shared/               # Shared domain types, Zod contracts, and API client
├── infrastructure/       # Docker Compose setup for PostgreSQL 16 + PostGIS 3.4
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
- **`shared/` (`@fastcharger/shared`)**: Canonical TypeScript interfaces, validation schemas, HTTP client (`FastChargerApiClient`), and geographic reference catalogs.
- **`infrastructure/`**: Local development Docker configuration for PostgreSQL + PostGIS.
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

## 4. Environment Variables

Create `.env.local` in the root workspace or target application:

| Variable | Target | Purpose | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Backend / Database / Worker | PostgreSQL connection string with PostGIS | `postgresql://postgres:postgres@localhost:5432/fastcharger` |
| `NEXT_PUBLIC_API_URL` | Frontend | URL of backend API for client & SSR fetch | `http://localhost:3001` |
| `NEXT_PUBLIC_SITE_URL` | Frontend | Canonical frontend site URL | `http://localhost:3000` |
| `PORT` | Backend | Port for standalone backend API | `3001` |
| `OPENCHARGEMAP_API_KEY` | Worker | API key for Open Charge Map provider ingestion | (optional for local mock/cache) |

---

## 5. Local Development

### 1. Start Infrastructure (PostgreSQL + PostGIS)
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

## 6. API Architecture & Versioned Contracts (v1)

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

## 7. Verification & Testing

The repository includes comprehensive unit, integration, spatial, and contract tests across all tiers:

```bash
# Run complete test suite (18 test files, 181 tests)
npm test

# Run canonical database ownership tests
npx vitest run tests/canonical-data-ownership.test.ts

# Run database schema & migration tests
npx vitest run tests/schema.test.ts

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

## 8. Migration Status

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

---

## 9. Independent Deployment

Each application tier is independently deployable:
- **Frontend**: Deployable to edge/serverless runtimes (Vercel, Cloudflare Pages, Netlify) with only `NEXT_PUBLIC_API_URL`. Does not require VPC peering or database credentials.
- **Backend API**: Deployable to container platforms (AWS ECS, Fly.io, Railway, Google Cloud Run) inside a private VPC with `DATABASE_URL`.
- **Worker**: Deployable as independent scheduled jobs or background containers.
- **Database**: Managed PostgreSQL + PostGIS (AWS RDS, Supabase, Neon).
