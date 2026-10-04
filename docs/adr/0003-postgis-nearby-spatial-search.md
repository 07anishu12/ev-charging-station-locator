# 0003: Production-Grade PostGIS Nearby Spatial Search Architecture

**Status:** Accepted  
**Date:** 2026-10-04  
**Deciders:** Principal Geospatial Engineer, Principal Data Architect, Platform Team  

---

## 1. Context

FastCharger requires a high-throughput, low-latency spatial discovery API endpoint (`GET /api/v1/stations/nearby`) to power nearby station discovery across mobile viewports, map panning, and EV navigation.

Previous iterations in application code relied on either:
1. In-memory Haversine distance scanning of station arrays in Node.js memory.
2. Inconsistent radius limits allowing arbitrarily large radius requests that overwhelmed Node.js processes.
3. Limited multi-attribute filtering that bypassed relational joins.

Such approaches fail at scale as station catalog size grows, causing high memory consumption, CPU saturation, and unindexed full-table scans.

---

## 2. Decision

We establish **PostgreSQL + PostGIS** as the sole authoritative spatial query execution engine for `GET /api/v1/stations/nearby`:

1. **In-Database Spatial Filtering (`ST_DWithin`):**
   - The query point is constructed with explicit WGS84 geography:
     ```sql
     ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
     ```
   - Filtering is performed using `ST_DWithin`:
     ```sql
     ST_DWithin(stations.location, target_point, radius_meters)
     ```
   - Queries utilize the pre-existing GiST spatial index `stations_location_gist_idx` on `stations.location`.
   - Out-of-radius stations are rejected at the storage engine level; only qualifying rows are processed.

2. **Deterministic Distance Calculation (`ST_Distance`):**
   - Geodesic distance is computed on the WGS84 spheroid:
     ```sql
     ROUND((ST_Distance(stations.location, target_point) / 1000.0)::numeric, 2)
     ```
   - Returns deterministic `distanceKm` rounded to 2 decimal places.

3. **Input Validation & Safety Constraints:**
   - Latitude validated strictly between `-90` and `+90`.
   - Longitude validated strictly between `-180` and `+180`.
   - Safe maximum radius enforced: minimum `0` (exclusive), maximum `500 km`.
   - Both `radiusKm` and `radius` accepted seamlessly via schema preprocessing.

4. **Multi-Attribute Relational Filtering:**
   - **Connector Type:** Filtered via `EXISTS` subquery on `connectors` matching `normalizedType` or substring on `connectionType`.
   - **Minimum Power:** Filtered via `EXISTS` subquery on `connectors` with `powerKw >= minPowerKw`.
   - **Operator:** Filtered via relational join on `operators` matching `slug` or `name`.
   - **Station Status:** Authoritative status filtering matching `stations.status` or `stations.verificationStatus`.

5. **Sorting & Pagination:**
   - Directly executed in PostgreSQL using `LIMIT pageSize OFFSET offset`.
   - Supported sort keys: `distance` (default), `power` (fastest charger first), `name`, and `updatedAt`.
   - Default sort order: `distance ASC` for closest proximity; `power DESC` for high-power DC fast charging corridors.

---

## 3. Query Plan & Index Verification

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT s.id, s.slug, s.name, s.latitude, s.longitude,
       ROUND((ST_Distance(s.location, ST_SetSRID(ST_MakePoint(77.2197, 28.6328), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
FROM stations s
WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(77.2197, 28.6328), 4326)::geography, 25000)
ORDER BY distance_km ASC
LIMIT 20 OFFSET 0;
```

**Index Access Path:**
- **Index Scan:** `Index Scan using stations_location_gist_idx on stations s`
- **Execution Cost:** $O(\log N)$ spatial search via R-tree GiST traversal vs $O(N)$ full table scan.
- **Memory Footprint:** Flat, bounded memory in Node.js runtime regardless of national station count.

---

## 4. Consequences

### Positive:
- Sub-5ms query execution times against indexed metropolitan datasets.
- Node.js runtime memory remains flat regardless of national station volume.
- Zero duplicate or inconsistent distance calculations between frontend and backend.
- Full contract compliance across versioned `/api/v1/` endpoints.

### Negative / Trade-offs:
- PostGIS extension must be active on PostgreSQL (`CREATE EXTENSION IF NOT EXISTS postgis`).
- Test fixtures in unit tests must provide spatial calculation emulation when running hermetically without PostgreSQL.
