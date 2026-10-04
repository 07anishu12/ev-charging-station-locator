# ADR 0001: Independent Application Architecture & Decoupled Frontend/Backend

- **Status**: Accepted
- **Date**: 2026-10-04
- **Deciders**: Principal Software Architect, Senior Backend Engineer, Senior Frontend Engineer

## Context

FastCharger originated as a full-stack Next.js monolith where UI components, route handlers, database access (Drizzle ORM / PostGIS), and ingestion logic coexisted in a single repository. While effective for early prototyping, this tight coupling introduced:
- Presentation code importing database connection pools and database secrets.
- Inability to build or deploy the frontend without database access.
- Inconsistent and non-type-safe data access patterns across pages and components.
- Coupling of background ingestion logic to frontend request cycles.

## Decision

We have transitioned FastCharger to an independent multi-package architecture:

```text
frontend/             (Next.js App Router, SSR/SSG, UI, Leaflet)
backend/              (Node.js + Hono standalone REST API at /api/v1/)
worker/               (Ingestion, provider sync, normalization)
database/             (PostgreSQL 16 + PostGIS, Drizzle schema, migrations)
shared/               (Contracts, Zod schemas, domain models, API client)
infrastructure/       (Docker Compose for local PostGIS)
docs/                 (Architecture docs and ADRs)
```

### Architectural Principles:
1. **Frontend Isolation**:
   - `frontend → HTTP → backend → database`.
   - The frontend never imports `pg`, `drizzle-orm`, or database connection pools.
   - The frontend never reads `DATABASE_URL`.
   - The frontend communicates with the backend exclusively via HTTP using `@fastcharger/shared/client` (`NEXT_PUBLIC_API_URL`).
2. **Standalone Backend**:
   - Backend is an independently deployable Hono HTTP service with Zod validation, spatial PostGIS queries, error masking, and rate limiting.
3. **Worker Isolation**:
   - Background ingestion and scheduled sync workers persist canonical records directly to the database without frontend dependencies.
4. **Shared Contracts**:
   - Domain types, validation schemas, and client wrappers live in `shared/` without database or framework couplings.

## Consequences

### Positive:
- **Zero-DB Buildability**: The frontend builds completely offline with `DATABASE_URL=""`.
- **Independent Scaling & Deployment**: Frontend can be deployed to edge runtimes (e.g. Vercel, Cloudflare Pages), while the backend and database run in secure VPC containers.
- **Security**: Database credentials, connection pools, and internal SQL structures are isolated within the backend/database/worker tiers and are never exposed to browser or client bundles.
- **Maintainability**: Clear separation of concerns with strong contract boundaries and 100% test coverage.

### Negative / Trade-offs:
- Requires maintaining API client abstractions and network error handling in frontend SSR/client components.
- Local development requires running both backend and frontend services (or Docker Compose for PostGIS).
