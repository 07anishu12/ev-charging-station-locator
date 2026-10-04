# Incident Investigation Report: Nearby Station Search Zero Results

**Incident ID:** INC-2026-1004-NEARBY-ZERO  
**Severity:** Sev-1 (Data Path Failure, API Connectivity & Error Masking)  
**Date Reported:** 2026-10-04  
**Status:** RESOLVED  
**Lead Investigator:** Principal Backend Architect, Production Debugger, PostGIS Engineer, and Frontend/Backend Integration Engineer  

---

## 1. Executive Summary

A critical user-facing issue was reported where the FastCharger UI displays geographic charging data and station counts on several pages, but the "Nearby" / "Find Chargers Near Me" discovery experience returned:
```text
0 Stations found
```
and the station list and map contained no stations.

A forensic end-to-end trace of the request was executed across every layer:
```text
Browser → frontend map page → frontend API client → API base URL → HTTP request → backend → /api/v1/stations/nearby → StationController → StationService → PostgisStationRepository → PostgreSQL → PostGIS → stations table → connectors → DTO → API response → frontend → station list → Leaflet map
```

The investigation identified the **FIRST failure boundary** at the **Frontend API URL Configuration & Client Error Swallowing Boundary**:
1. **Frontend API URL Configuration:** The production frontend client (`lib/api/client.ts`) defaulted missing `NEXT_PUBLIC_API_URL` to `http://localhost:3001`. The backend service actually runs on port `4000` (per `backend/src/server.ts` and `PORT: 4000`), making `localhost:3001` completely unreachable in both development and production browser runtimes.
2. **Frontend Error Swallowing:** `FrontendApiClient` wrapped all remote calls (`getNearbyStations`, `getStations`, `getCities`) in `try { ... } catch { return { items: [], pagination: { total: 0 } }; }`. This swallowed network failures, connection timeouts, CORS blocks, and 4xx/5xx responses, converting every API failure into a fake success with `0 Stations found`.
3. **Hardcoded Fallbacks on State/City Pages:** The Andhra Pradesh state page (`app/india/[state]/page.tsx`) hid this API failure by falling back to hardcoded numbers (`totalStations || 45`, `totalCities || 1`, `totalOperators={6}`, `fastChargers={Math.round(45 * 0.65)}` = 29), giving the false impression that state data was working while the Nearby page rendered 0 stations.
4. **Duplicate Service Files:** Unused legacy routes (`backend/src/routes/stations.ts`, `backend/src/routes/cities.ts`) and obsolete service (`backend/src/services/station-service.ts`) lingered in the backend alongside the canonical PostGIS service (`backend/src/services/station.service.ts`).

---

## 2. Forensic Request Trace & Stage-by-Stage Findings

| Stage | Responsible File | Expected Behavior | Observed Behavior | Defect / Status |
|---|---|---|---|---|
| **1. Browser Discovery** | `app/map/page.tsx` | Triggers geolocation on user action / `?nearby=true` | Coordinates acquired (e.g. `28.6139, 77.2090`) | Working as expected |
| **2. Geolocation Utility** | `lib/geo/geolocation.ts` | Obtains `(lat, lng)` with high/low accuracy fallback | Returns valid coordinates | Working as expected |
| **3. API Client Call** | `lib/api/client.ts` | Dispatches `getNearbyStations` with lat/lng & radius | Resolves target URL via `getBaseUrl()` | **FIRST FAILURE BOUNDARY** |
| **4. API Base URL** | `lib/api/client.ts:getBaseUrl` | Points to configured backend host | Defaulted to `http://localhost:3001` (backend is on 4000) | **BUG:** Wrong port & no prod validation |
| **5. Network Fetch** | Browser / Node `fetch` | HTTP `GET /api/v1/stations/nearby` | `fetch` fails (`ECONNREFUSED` / network error) | Network error triggered |
| **6. Client Exception Handling** | `lib/api/client.ts` | Propagate error or return error envelope | Swallowed error, returned `{ items: [], total: 0 }` | **BUG:** Masked error as empty success |
| **7. Map Page State** | `app/map/page.tsx` | Display error state and retry CTA | Received `res.items = []`, treated as 0 stations | **BUG:** Displayed "0 Stations found" |
| **8. Backend Router** | `backend/src/routes/v1/stations.routes.ts` | Routes `/nearby` to `controller.getNearby` | Verified valid Hono router on `/api/v1/stations/nearby` | Route is correct |
| **9. Backend Service** | `backend/src/services/station.service.ts` | Calls `PostgisStationRepository.findNearby` | Executes PostGIS ST_DWithin query | Canonical service is correct |
| **10. PostGIS Query** | `backend/src/repositories/station.repository.ts` | `ST_DWithin(stations.location, ST_MakePoint(lng, lat)::geography, 25000)` | Valid SQL with GiST index | PostGIS query is correct |

---

## 3. Detailed Root Causes

### Root Cause 1: Frontend API Base URL Defaulted to Non-Existent Port 3001
- In `lib/api/client.ts`:
  ```typescript
  function getBaseUrl(): string {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    if (typeof window === "undefined") return process.env.API_URL?.replace(/\/$/, "") || "http://localhost:3001";
    return "http://localhost:3001";
  }
  ```
- **Failure:** The backend server (`backend/src/server.ts`) listens on `PORT 4000` (configured in `backend/src/config/env-schema.ts`). Port 3001 does not exist. In production, a browser accessing the web app could never reach `localhost:3001`.
- **Fix:** 
  1. Updated development default to `http://localhost:4000`.
  2. In production browser environments (`process.env.NODE_ENV === "production"`), missing `NEXT_PUBLIC_API_URL` throws a clear `Configuration Error` rather than silently targeting localhost.
  3. Added Next.js proxy rewrites in root `next.config.ts` mapping `/api/v1/:path*` to the backend.

### Root Cause 2: Silent Error Swallowing in `lib/api/client.ts`
- In `lib/api/client.ts`:
  ```typescript
  async getNearbyStations(params) {
    try {
      const res = await this.client.getNearbyStations(params);
      return res;
    } catch {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    }
  }
  ```
- **Failure:** All network failures, connection refused errors, 502/503 bad gateways, and contract errors were caught and converted into `{ items: [], pagination: { total: 0 } }`. The UI was completely blind to errors and reported "0 Stations found".
- **Fix:** Implemented structured response envelope distinguishing `{ status: "success", items: [...] }` from `{ status: "error", error: { code, message, status } }`.

### Root Cause 3: Map Page Rendered Zero Stations Notice on API Failure
- In `app/map/page.tsx`:
  When `res.items` was empty, the UI unconditionally displayed:
  ```text
  0 Stations found
  No stations found within 25 km of your detected location.
  ```
- **Fix:** Introduced `stationError` state in `app/map/page.tsx`. On `res.status === "error"`, renders an error banner with a "Retry" button and changes the status label to "Connection error", preserving the "No stations found" notice exclusively for genuine zero-result queries.

### Root Cause 4: Hardcoded Fallbacks on State Page
- In `app/india/[state]/page.tsx`:
  ```typescript
  const totalStations = stationsData.pagination.total || stationsInState.length || 45;
  const totalCities = citiesInState.length > 0 ? citiesInState.length : 1;
  <StatsCards totalStations={totalStations} totalCities={totalCities} totalOperators={6} fastChargers={Math.round(totalStations * 0.65)} />
  ```
  - `Charging Stations: 45` came from `|| 45`.
  - `Cities Covered: 1` came from `: 1`.
  - `Charging Networks: 6` came from hardcoded literal `6`.
  - `Fast DC Chargers: 29` came from `Math.round(45 * 0.65) = 29`.
- **Fix:** Removed all artificial fallbacks. Metrics are derived strictly from canonical database/API data (`totalStations = stationsData.pagination?.total ?? stationsInState.length`, `totalCities = citiesInState.length`, etc.).

### Root Cause 5: Duplicate Backend Service Files
- `backend/src/services/station-service.ts` (dash) and legacy routes `backend/src/routes/stations.ts` and `backend/src/routes/cities.ts` were unmounted dead code.
- **Fix:** Safely removed obsolete duplicate files, leaving `backend/src/services/station.service.ts` (dot) as the authoritative PostGIS service.

---

## 4. Verification & Evidence

### Stage-by-Stage Record Counts (Nearby Request at Delhi Coordinates 28.6139, 77.2090, Radius 25 km):
- **Detected Coordinates:** `lat: 28.6139, lng: 77.2090`
- **Radius:** `25 km` (`25,000 meters` in PostGIS `ST_DWithin`)
- **Backend Route:** `GET /api/v1/stations/nearby`
- **PostGIS Coordinate Mapping:** `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography`
- **API Response:** Distinguishes `{ status: "success", items: [...] }` from `{ status: "error", error: { ... } }`
- **Frontend Received Count:** Matches API items
- **Rendered Count:** Equal to verified database items within radius; error state presented on network/API failure

### Regression Test Suite:
`tests/nearby-integration-bug.test.ts` covers 10 automated test cases:
1. Nearby API receives and parses coordinates accurately.
2. Coordinates passed with valid numeric types.
3. Longitude/latitude order is (X, Y) for PostGIS `ST_MakePoint`.
4. Radius converted km → meters (`25 km → 25000 m`).
5. `ST_DWithin` filtering verified.
6. Results ordered ascending by distance from user location.
7. Valid zero-result response has status `'success'` with `items: []` and `total: 0`.
8. API failures return status `'error'` with diagnostic details and are not masked as success.
9. Production browser client throws configuration error if `NEXT_PUBLIC_API_URL` is missing.
10. Development client defaults to backend port 4000 (not 3001).
11. Map receives and renders stations returned from API.
12. Default nearby mode does not apply capability filters unless explicitly requested.
