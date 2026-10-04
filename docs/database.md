# FastCharger Canonical Database Architecture

## 1. Architectural Roles

FastCharger enforces a strict division of data persistence responsibilities:

> **POSTGRESQL = canonical business data**
> **POSTGIS = canonical geographic intelligence**

- **PostgreSQL** is the sole authoritative system of record for all business entities: states, districts, cities, localities, pincodes, aliases, operators, stations, connectors, station status, verification state, multi-provider identity mappings, audit sync logs, and data quality issues.
- **PostGIS** (`geography(Point, 4326)`) is the sole authoritative engine for spatial intelligence: coordinate validation, spatial distance metrics, bounding box queries, and radius-based nearby station discovery. Critical spatial calculations execute strictly database-side via indexed PostGIS expressions (`ST_DWithin`, `ST_Distance`).
- **Redis is NOT authoritative**: Cache only, volatile, invalidated upon database mutation.
- **MongoDB is NOT authoritative**: Telemetry, operational event logs, and raw payload archival only.
- **Object Storage is NOT authoritative**: Media assets, photos, and export bundles only.
- **Frontend state is NOT authoritative**: Ephemeral UI presentation cache only.
- **Provider API responses are NOT authoritative**: External untrusted inputs requiring normalization, identity resolution, and schema validation.

---

## 2. Canonical Entity-Relationship Dictionary

| Entity | Primary Key | Foreign Keys | Key Constraints & Indexes | Description |
|---|---|---|---|---|
| `states` | `id` (UUID) | None | Unique `slug`, index on `name` | Canonical Indian states and Union Territories. |
| `districts` | `id` (UUID) | `state_id` -> `states.id` (CASCADE) | Unique `slug`, indexes on `state_id`, `name`, `slug` | Administrative districts within states. |
| `cities` | `id` (UUID) | `state_id` -> `states.id` (CASCADE) | Unique `slug`, indexes on `slug`, `state_id`, `station_count` | Municipal urban areas and cities. |
| `city_aliases` | `id` (UUID) | `city_id` -> `cities.id` (CASCADE) | Unique `(alias, city_id)`, index on `alias` | Canonical spelling and colloquial city aliases (e.g. Bangalore -> Bengaluru). |
| `localities` | `id` (UUID) | `city_id` -> `cities.id` (CASCADE), `state_id` -> `states.id`, `district_id` -> `districts.id` | Unique `(city_id, slug)`, indexes on `city_id`, `slug`, GIST on `location` | Sub-city neighborhoods and geographic micro-markets. |
| `pincodes` | `pincode` (VARCHAR(6)) | `city_id` -> `cities.id`, `state_id` -> `states.id` | Indexes on `city_id`, `state_id`, `(latitude, longitude)` | 6-digit Indian Postal Index Numbers. |
| `operators` | `id` (UUID) | None | Unique `slug`, index on `name` | EV charging network operators and CPOs. |
| `stations` | `id` (UUID) | `operator_id` -> `operators.id`, `city_id` -> `cities.id`, `state_id` -> `states.id` | Unique `slug`, unique `external_id`, unique `ocm_id`, GIST index on `location`, indexes on `city_id`, `state_id`, `operator_id`, `status`, `verification_status`, `pincode` | Canonical charging station locations with PostGIS geography point. |
| `station_provider_mappings` | `id` (UUID) | `station_id` -> `stations.id` (CASCADE) | Unique `(provider_name, provider_station_id)`, index on `station_id` | Deterministic upstream provider cross-references (OCM, Kazam, Statiq, etc.). |
| `connectors` | `id` (UUID) | `station_id` -> `stations.id` (CASCADE) | Unique `ocm_connection_id`, indexes on `station_id`, `normalized_type` | Charging plugs, power output (kW), voltage, amperage, and connector status. |
| `sync_logs` | `id` (UUID) | None | Indexes on `started_at`, `status` | Audit history of ingestion runs, counts, and duration. |
| `data_quality_issues` | `id` (UUID) | `station_id` -> `stations.id` (CASCADE) | Indexes on `station_id`, `ocm_id`, `issue_type`, `resolved` | Non-destructive audit trail of malformed or incomplete provider data. |

---

## 3. Station Identity & De-duplication Model

Repeated provider synchronizations must **never** create duplicate stations. FastCharger applies a deterministic 3-tier identity resolution pipeline:

1. **Direct Provider Identity Mapping (`station_provider_mappings`)**:
   - Upstream records are queried against `(provider_name, provider_station_id)`.
   - If a mapping exists, the record updates the existing canonical station.
2. **PostGIS Spatial Proximity + Network/Name Fingerprint**:
   - If no provider mapping exists, a database-side spatial query evaluates candidates within a **25-meter radius** (`ST_DWithin(stations.location, targetPoint, 25)`).
   - If a candidate shares the same operator slug or matching normalized name tokens, it is resolved as the same physical charging site.
   - The upstream provider ID is linked to the existing station via `station_provider_mappings`.
3. **Deterministic Slug Generation**:
   - For new stations, slugs follow the deterministic pattern:
     `[name-slug]-[location-slug]-[provider]-[provider-id]` (or `[name-slug]-[location-slug]-g[latGrid]-[lngGrid]`).
   - Slugs remain stable and immutable across delta synchronizations.

---

## 4. PostGIS Spatial Representation & Queries

- **Data Type**: `geography(Point, 4326)` representing longitude and latitude on the WGS 84 ellipsoid.
- **Index**: GiST (Generalized Search Tree) spatial index `stations_location_gist_idx` and `localities_location_gist_idx`.
- **Database-Side Calculation**:
  - Distance calculation:
    ```sql
    ROUND((ST_Distance(stations.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
    ```
  - Proximity radius filter:
    ```sql
    ST_DWithin(stations.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_in_meters)
    ```
- **Rule**: Stations are never loaded in bulk into application memory for distance calculation. All filtering, bounding, and sorting occurs in PostgreSQL.

---

## 5. Data Quality & Anomaly Tracking

Invalid provider records must **never silently disappear**. Malformed records are preserved in `data_quality_issues`:

- `invalid_coordinates`: Lat/lng out of valid bounds (`[-90, 90]` / `[-180, 180]`) or Null Island `(0, 0)`. Severity: `error`. Station skipped from map rendering to preserve PostGIS spatial integrity.
- `invalid_pincode`: Postal codes failing 6-digit numeric pattern. Severity: `warning`.
- `missing_city`: Stations missing city association. Severity: `warning`.
- `ambiguous_city`: Station town strings resolving to multiple canonical candidates. Severity: `warning`.
- `duplicate_provider_record`: Repeated upstream provider records with identical provider keys. Severity: `error`.
- `malformed_connector`: Connectors missing power kW or type specifications. Severity: `warning`.
- `invalid_status`: Operational statuses not matching canonical dictionary. Severity: `warning`.

---

## 6. Migration History & Rollback Procedures

| Migration | File | Description | Rollback SQL |
|---|---|---|---|
| `0000` | `0000_powerful_gamma_corps.sql` | PostGIS extension & base stations table | `DROP TABLE "stations"; DROP EXTENSION IF EXISTS postgis;` |
| `0001` | `0001_tired_marvel_zombies.sql` | Domain tables: states, cities, aliases, pincodes, operators, connectors, sync_logs, data_quality_issues | `DROP TABLE "data_quality_issues", "sync_logs", "connectors", "operators", "pincodes", "city_aliases", "cities", "states" CASCADE;` |
| `0002` | `0002_supreme_iron_monger.sql` | Unique constraint on `connectors.ocm_connection_id` | `ALTER TABLE "connectors" DROP CONSTRAINT "connectors_ocm_connection_id_unique";` |
| `0003` | `0003_canonical_postgis_entities.sql` | `districts`, `localities`, `station_provider_mappings`, `stations.verification_status` | `DROP INDEX IF EXISTS "stations_verification_status_idx"; ALTER TABLE "stations" DROP COLUMN IF EXISTS "verification_status"; DROP TABLE IF EXISTS "station_provider_mappings", "localities", "districts" CASCADE;` |

---

## 7. MongoDB Operational & Flexible Document Event Layer

MongoDB acts strictly as a flexible document and operational telemetry store. **MongoDB is NOT a secondary station database.**

### Canonical Persistence Division:
- **PostgreSQL / PostGIS:** Authoritative for canonical stations, connectors, operators, cities, districts, localities, pincodes, and spatial queries.
- **MongoDB:** Flexible events, provider payloads, search analytics, and operational telemetry.
- **Redis:** Volatile caching and temporary acceleration.
- **Object Storage:** Media assets, photos, and raw payload archives.

### Allowed Collections & Workloads:
1. `ingestion_events`: Sync run lifecycle, batch checkpoints, and provider ingestion metrics. Retention: 90 days.
2. `provider_processing_events`: Upstream raw payload diffs, normalization transitions, and rate-limiting telemetry. Retention: 30 days.
3. `data_quality_events`: Historical anomaly event log (coordinate errors, PIN code anomalies, malformed plugs) for provider decay analysis. Retention: 180 days.
4. `search_analytics_events`: High-volume query telemetry, filter selections, zero-result terms, and latency monitoring. Retention: 30 days.
5. `operational_events`: Circuit breaker status, system boot events, cache drop notifications, and health telemetry. Retention: 14 days.
6. `audit_events`: Security actions, schema migration logs, and configuration changes. Retention: 365 days.

### Prohibited Entities:
MongoDB must **never** store canonical stations, canonical cities, canonical pincodes, canonical connectors, or the canonical geographic hierarchy.

### Deterministic Event Envelope:
```typescript
interface BaseEvent<TPayload> {
  eventId: string;          // UUID or deterministic hash
  eventType: string;        // Dot-notated event identifier
  timestamp: Date;          // ISO Date
  source: string;           // Emitting component
  correlationId: string;    // Distributed tracing ID
  entityId?: string | null; // Optional business entity ID reference
  payload: TPayload;        // Flexible document payload
  version: number;          // Schema version (>= 1)
  expiresAt?: Date;         // Optional explicit TTL target
}
```

### Collection Index Specifications:
Each event collection enforces:
- Unique Index: `{ eventId: 1 }` (unique: true) for idempotency and duplicate elimination.
- Compound Index: `{ timestamp: -1, eventType: 1 }` for time-series range queries and incident investigation.
- Correlation Index: `{ correlationId: 1 }` for tracing workflows across worker and backend tiers.
- Sparse Entity Index: `{ entityId: 1 }` for tracking events against specific business references.
- TTL Retention Index: `{ timestamp: 1 }` with collection-specific `expireAfterSeconds`.

### Failure Isolation & Fallback Policy:
- MongoDB failures **never** impact PostgreSQL-backed APIs or core station discovery.
- If MongoDB is unreachable, the event store switches to `BUFFER_AND_LOG` mode:
  - Events are buffered in an in-memory ring buffer (up to 500 items).
  - Diagnostic warnings are emitted.
  - User-facing responses return HTTP 200 without error.
