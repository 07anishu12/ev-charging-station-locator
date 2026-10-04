# FastCharger API v1 Contract Documentation

## 1. Overview & Versioning

The FastCharger API provides versioned HTTP endpoints for discovery, search, and details of EV charging stations across India.

- **Current Version**: `v1` (`/api/v1/`)
- **Contract Package**: `@fastcharger/shared` (`shared/contracts/`)
- **Technology**: TypeScript + Zod
- **Base URL Configuration**:
  - Frontend client: `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001`)
  - Standalone Backend service: `PORT` (default: `3001`)

---

## 2. Architectural Boundary & Invariants

```text
frontend  ──(HTTP JSON / v1)──▶  backend  ──(SQL / PostGIS)──▶  database
```

- **Zero Database Entity Leakage**: Drizzle table rows and internal relational schemas are never exposed directly to the public API.
- **DTO Transformation**: Database Row $\to$ Repository $\to$ Domain Model $\to$ API DTO $\to$ Zod Response Contract $\to$ HTTP JSON.
- **Contract Ownership**: The contracts live in `shared/contracts/`. Frontend and Backend both consume these schemas.

---

## 3. Response & Error Envelopes

### Success Envelope
All successful responses return HTTP 200 (or 201/204) with standard envelope:

```json
{
  "data": { ... }
}
```

For paginated responses:
```json
{
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 142,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

### Error Envelope
All error responses return non-200 HTTP status codes (e.g. 400, 404, 429, 500) with a structured error envelope:

```json
{
  "error": {
    "code": "STATION_NOT_FOUND",
    "message": "Station 'tata-cp' was not found.",
    "details": { ... }
  }
}
```

### HTTP Status Code Semantics
- `200 OK`: Successful read operation.
- `400 Bad Request`: Invalid request syntax or schema validation error (`VALIDATION_ERROR`).
- `404 Not Found`: Resource does not exist (`NOT_FOUND`, `STATION_NOT_FOUND`, `CITY_NOT_FOUND`, `PINCODE_NOT_FOUND`).
- `413 Payload Too Large`: Request payload exceeds 1MB limit (`PAYLOAD_TOO_LARGE`).
- `429 Too Many Requests`: Rate limit exceeded (`RATE_LIMIT_EXCEEDED`).
- `500 Internal Server Error`: Unexpected server error (`INTERNAL_SERVER_ERROR`).
- `503 Service Unavailable`: Temporary dependency or database outage (`SERVICE_UNAVAILABLE`).

---

## 4. Endpoint Inventory

### Current (Implemented in v1)

| Method | Endpoint | Description | Query / Path Parameters |
|---|---|---|---|
| `GET` | `/health` | Service health status | None |
| `GET` | `/health/db` | Database & PostGIS connectivity check | None |
| `GET` | `/api/v1/stations` | Paginated station catalog | `page`, `pageSize`, `city`, `state`, `operator`, `status`, `connectorType`, `minPowerKw`, `search` |
| `GET` | `/api/v1/stations/:slug` | Detailed station profile | Path: `:slug` (alphanumeric, dashes, underscores) |
| `GET` | `/api/v1/stations/nearby` | Spatial radius search | `latitude` (req), `longitude` (req), `radiusKm` (opt, default: 10), `minPowerKw`, `connectorType`, `page`, `pageSize` |
| `GET` | `/api/v1/cities` | Paginated list of indexed cities | `page`, `pageSize` |
| `GET` | `/api/v1/cities/:slug` | City stations & operator breakdown | Path: `:slug`, Query: `page`, `pageSize`/`limit`, `minPowerKw`, `connectorType` |
| `GET` | `/api/v1/pincodes/:pincode` | Pincode location & chargers | Path: `:pincode` (6 digits), Query: `page`, `pageSize`, `radiusKm` (default: 5) |
| `GET` | `/api/v1/search` | Unified search (cities, stations, PINs) | Query: `q` (min 1 char), `page`, `pageSize`, `radiusKm` |

### Planned (Future API Milestones)

| Method | Planned Endpoint | Milestone | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/stations` | Phase 2 | CPO Station registration / ingestion webhook |
| `POST` | `/api/v1/stations/:slug/feedback` | Phase 2 | Community check-ins and plug status reporting |
| `GET` | `/api/v1/operators` | Phase 2 | Operator directory and network details |
| `GET` | `/api/v1/routes/corridor` | Phase 3 | EV highway corridor charging planner |

---

## 5. Backward Compatibility Policy

Within the `v1` API lifecycle:

### Allowed (Non-breaking):
- Adding optional fields to response objects.
- Adding optional query parameters to existing endpoints.
- Introducing new endpoints under `/api/v1/`.
- Adding new enum values when clients safely fallback to `"other"` / `"unknown"`.

### Forbidden (Breaking - Requires `/api/v2/`):
- Removing response fields.
- Renaming existing response fields.
- Changing field data types or semantics (e.g. string to number, km to miles).
- Making optional request parameters required.
- Altering the shape of the error or pagination envelopes.
