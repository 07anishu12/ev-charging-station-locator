# FastCharger Architecture Documentation

## 1. Executive Summary

FastCharger is an India-wide EV charging discovery platform designed with a strict decoupled architecture. The system separates user presentation, high-performance geospatial queries, background data synchronization/ingestion, and canonical persistence into dedicated, independently deployable packages and applications.

---

## 2. Architectural Boundaries & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│  (Next.js App Router, React 19, Tailwind CSS 4, SSR)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / REST API
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
1. **Frontend $\to$ HTTP $\to$ Backend $\to$ Database**:
   - The frontend **never** imports `pg`, `drizzle-orm`, or database connection pools.
   - The frontend **never** references `DATABASE_URL`.
   - The frontend communicates with the backend exclusively over HTTP using `@fastcharger/shared/client` or `frontend/lib/api`.
2. **Worker $\to$ Database**:
   - Background ingestion and scheduled sync workers persist canonical station records directly into the database.
   - Workers never depend on frontend components or frontend runtime code.
3. **Shared Contracts**:
   - Domain types, API contracts, Zod schemas, and HTTP client wrappers live in `shared/`.
   - `shared/` is strictly dependency-free with respect to database drivers, backend servers, and UI components.

---

## 3. Package & Application Responsibilities

### `frontend/` (`@fastcharger/frontend`)
- **Technology**: Next.js 16, React 19, Tailwind CSS 4.
- **Responsibilities**:
  - Pure presentation, responsive mobile-first UI, and technical SEO.
  - Server-Side Rendering (SSR) & Static Site Generation (SSG).
  - Leaflet map rendering with client-side geolocation.
  - UI state management, skeleton loaders, and error boundaries.
  - Direct consumption of backend REST API via `NEXT_PUBLIC_API_URL` (or same-origin `/api/v1/` proxy).
  - Explicit error envelope handling (`res.status === "error"`) with user-friendly retry banners, avoiding false "0 Stations found" masks.

### `backend/` (`@fastcharger/backend`)
- **Technology**: Node.js, Hono, Zod, Drizzle ORM.
- **Responsibilities**:
  - Standalone HTTP REST API exposed at `/api/v1/`.
  - Request validation and parameter coercion using Zod.
  - Spatial PostGIS queries (`ST_DWithin`, `ST_Distance`) for nearby station lookups.
  - City, state, pincode, and station detail queries with pagination and sorting.
  - Standardized JSON responses (`success`, `data`, `meta`, `error`).
  - Rate limiting, CORS, and security middleware.

### `database/` (`@fastcharger/database`)
- **Technology**: PostgreSQL 16 + PostGIS 3.4, Drizzle ORM.
- **Responsibilities**:
  - Canonical database schema definitions (`stations`, `connectors`, `providers`).
  - Spatial indexes (`GIST` index on geometry/geography coordinates).
  - Version-controlled SQL migration scripts (`database/migrations/`).
  - Database pool initialization and connection health checks.

### `worker/` (`@fastcharger/worker`)
- **Technology**: TypeScript, Node.js background processes.
- **Responsibilities**:
  - Upstream provider ingestion (Open Charge Map, future CPO APIs).
  - Data normalization into canonical schemas.
  - Pincode and city discovery workflows.
  - Scheduled synchronization jobs.

### `shared/` (`@fastcharger/shared`)
- **Technology**: Pure TypeScript.
- **Responsibilities**:
  - Universal domain models and station/connector interfaces.
  - Zod schemas and request/response API contracts.
  - Shared API client implementation (`FastChargerApiClient`).
  - Canonical geographical reference data (Indian states, cities, pincodes).

### `infrastructure/`
- Local Docker Compose configurations (PostGIS 16-3.4 container).
- Cloud deployment specifications and environment templates.

---

## 4. Deployment Independence

Each primary application (`frontend`, `backend`, `worker`) maintains its own `package.json` and build scripts, allowing for completely independent deployment lifecycles:

- **Frontend Deployment**: Can be hosted on Vercel, Cloudflare Pages, or AWS Amplify with zero database credentials. Only requires `NEXT_PUBLIC_API_URL`.
- **Backend Deployment**: Can be deployed to AWS ECS, Fly.io, Railway, or Google Cloud Run with `DATABASE_URL`.
- **Worker Deployment**: Can run as standalone cron containers or serverless background tasks.
- **Database**: Managed PostgreSQL instance with PostGIS extension enabled (e.g. AWS RDS PostGIS, Supabase, Neon).
