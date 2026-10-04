# ADR 0002: Versioned v1 API Contract Layer

- **Status**: Accepted
- **Date**: 2026-10-04
- **Deciders**: Principal API Architect, Principal Software Architect, Senior Backend Engineer

## Context

Prior to this architectural phase, FastCharger had decoupled physical boundaries (`frontend/`, `backend/`, `shared/`), but the API schemas and request/response shapes were loosely typed or duplicated across folders. For true independent deployment, where:
- A newer frontend might run against an existing backend, or
- A newer backend might serve an older cached or deployed frontend,
the system requires a formal, versioned contract layer that guarantees backward compatibility and prevents runtime serialization drift.

## Decision

We establish a strict, versioned API contract system at `/api/v1/` governed by `@fastcharger/shared/contracts`:

1. **Contract Structure**:
   `shared/contracts/` owns:
   - `common.ts`: Coordinate primitives, standard success/error envelopes, `parseQuery` helper.
   - `errors.ts`: Deterministic error codes and HTTP status mappings.
   - `pagination.ts`: Standard pagination parameters and `PaginationMeta`.
   - `geographic.ts`: Bounding boxes, entities, distance.
   - `station.ts`: Connector schemas, `StationSummary`, `StationDetail`, and spatial queries.
   - `city.ts`: City summary, operator breakdowns, city stations queries.
   - `locality.ts`: Sub-city locality schemas.
   - `pincode.ts`: PIN code schemas and location data.
   - `search.ts`: Search queries and categorized entity results.
2. **Framework Independence**:
   - Zero framework leakage: `shared/contracts` imports only `zod` and pure TypeScript.
3. **Database Entities Are Not API Contracts**:
   - Drizzle tables, raw SQL rows, and internal relations are never exposed directly.
   - Response DTOs are mapped and validated against Zod response schemas.
4. **Shared Client**:
   - `FastChargerApiClient` validates URLs, parses envelopes, normalizes HTTP errors, and optionally validates responses.
5. **Strict Compatibility Rules**:
   - Non-breaking changes (additive optional fields/params) remain in `v1`.
   - Breaking changes require `/api/v2/`.

## Consequences

- Full independent deployment safety for both frontend and backend.
- Single source of truth for request validation in backend and response parsing in frontend.
- Tested with 18 dedicated contract tests covering validation, malformed input rejection, client parsing, error envelopes, and backward compatibility.
