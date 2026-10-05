# Prompt 11.7 — Data activation verification

Verified 2026-10-05T04:07:06.682Z against the actual local PostgreSQL/PostGIS database and running Hono API. Prompt 12 has not started. This report describes measured coverage, not a claim that every charging station in India is known.

## Research import

| Measure | Result |
|---|---:|
| Research input records | 31,066 |
| Valid coordinate/identity records | 30,948 |
| Invalid records, preserved as quality issues | 118 |
| Distinct canonical stations represented by valid research input | 30,809 |
| Input-to-canonical reduction through identity reconciliation | 139 |
| Initial import canonical stations created | 28,936 |
| Initial import update operations | 2,012 |
| Initial strict spatial identity matches | 40 |
| Consecutive import: created / updated / unchanged | 0 / 0 / 30,948 |
| Valid research input records with provider mappings | 30,948 |
| Conflicting research identity groups | 0 |
| Pre-existing synthetic fixtures moved to quarantine | 44 |
| Source-backed historical stations additional to research inventory | 2 |
| Final canonical station count | 30,811 |

Initial update operations are input-record operations, not a count of distinct stations. The 139-record reduction is measured by joining all valid research provenance IDs to canonical mappings, rather than guessing from input totals. Forty matches used the strict spatial/name/address/operator rule; other identity matches use provider mappings. Potential duplicates remain review issues and are not automatically merged on proximity alone.

The exact dataset is `research/ev-india/datasets/india-master.csv`; provenance evidence also comes from adjacent `station-sources.csv`. Profile: 30,948 with coordinates; 118 without; 347 repeated coordinate pairs; 443 repeated nonempty names; 31,066 with provider IDs, zero without; 30,387 with operators; 30,421 with connectors; 31,066 with inventory status and source provenance. Inventory status is not live availability.

The original 1,919-row database contained 44 unacquired mock fixture rows. Exact matching original rows, connector records and quality records are preserved in PostgreSQL `quarantined_station_records`; acquired provider records and status history were not deleted. Historical seed scripts now require an explicitly enabled disposable test database.

## Authoritative database totals

| Entity | PostgreSQL count |
|---|---:|
| Stations | 30,811 |
| Connector inventory records | 34,295 |
| Operators | 241 |
| States / union territories | 36 |
| District labels | 1,423 |
| Registered city labels | 5,954 |
| Cities with canonical stations | 5,287 |
| Pincodes | 1,072 |
| Stations missing coordinates | 0 |
| Stations missing provider provenance | 0 |

Geographic labels retain source assertions and are provisional; district/city totals are database records, not verified administrative coverage. Connector counts represent provider-scoped inventory records; physical connector equivalence across providers cannot be assumed without corroborating identities. Research/city aggregation quality issues remain auditable. Source gaps remain: 614 stations lack resolved state, 610 lack city and 589 lack operator; these are retained with quality issues rather than invented geography.

## Delhi/NCR

Raw: **2,966**; valid: **2,966**; canonical: **2,944**; input-to-canonical reduction: **22**; invalid: **0**; canonical with coordinates: **2,944**. These use the research bounding box (28.2–29.1° N, 76.8–77.7° E), not the statutory NCR boundary. Delhi city aggregation is a separate definition.

Nearby tests use the existing Delhi reference point 28.6139, 77.209 and actual PostGIS `ST_DWithin`:

| Radius | Database | Nearby API total | Result |
|---|---:|---:|---|
| 1 km | 6 | 6 | PASS |
| 5 km | 203 | 203 | PASS |
| 10 km | 904 | 904 | PASS |
| 25 km | 2,602 | 2,602 | PASS |

## City consistency

| City | Database stations | City API pagination | Statistics API | Result |
|---|---:|---:|---:|---|
| delhi | 2,282 | 2,282 | 2,282 | PASS |
| mumbai | 557 | 557 | 557 | PASS |
| bengaluru | 3,823 | 3,823 | 3,823 | PASS |
| hyderabad | 454 | 454 | 454 | PASS |
| chennai | 398 | 398 | 398 | PASS |
| gurugram | 190 | 190 | 190 | PASS |
| noida | 152 | 152 | 152 | PASS |
| pune | 2,022 | 2,022 | 2,022 | PASS |

Home popular-city cards and city pages consume these canonical APIs. Global counts consume `/api/v1/statistics`, including the actual covered-city count, rather than summing the first page of cities.

## Provider acquisition and refresh

| Provider | Fetched | Valid | Invalid | New | Updated | Unchanged |
|---|---:|---:|---:|---:|---:|---:|
| OCM, consecutive final refresh | 1,979 | 1,977 | 2 | 0 | 0 | 1,977 |
| BEE, consecutive publication refresh | 29,366 derived sites | 29,250 | 116 | 0 | 0 | 29,250 |

BEE's official PDF contains charger rows grouped into sites; derived site identities are not asserted official BEE IDs. The latest immediate weekly run fetched 29,366 BEE sites (29,250 validated, 116 rejected), created zero stations and updated 29,250 source-derived records; subsequent OCM reconciliation created zero and updated two records. A consecutive final OCM refresh reported 1,977 unchanged and zero status changes. Source-hash changes after the merged research import are counted honestly as updates. The original BEE PDF archive is 7,942,286 bytes, with a recorded SHA-256 checksum and HTTP 200.

The official download succeeds; an authorized BEE open API endpoint was not established. Weekly download targets the verified publication URL, so a new publication requires configuration review. Other CPO feeds remain **ACCESS_REQUIRED**. [Provider access review](provider-access-review.md) records official evidence and unknown capabilities; Bolt.Earth Discovery and ChargeIndia OCPI are potential legitimate feeds requiring access/credentials.

Static snapshots, mappings, raw input, source timestamps and ingestion reports are persisted. Reports distinguish recorded status observations (`statusUpdates`) from changes in provider status (`statusChanges`). Redis is not configured here, so cache invalidation is explicitly audited as skipped; the backend continues to read PostgreSQL. An immediate scheduled run acquired both real BEE and OCM sources successfully. The installed Mac launchd job wakes every 900 seconds, with last exit code 0; providers gate metadata to 604,800 seconds. The Linux cron equivalent is included but has not been deployed to a cloud host.

One intentionally overlapping import/OCM run failed on a database write and rolled back; canonical records were preserved and the retry succeeded. The redundant city-count update outside the ingestion transaction was removed to avoid competing writes. Other failed attempts remain in `ingestion_runs`; failures are not erased from the audit trail.

## Status verification

| Measure | Stations |
|---|---:|
| Known provider-derived operational status | 1,946 |
| Trustworthy current live availability | 0 |
| Stale status | 1,842 |
| Unknown availability | 30,811 |
| Active manual overrides | 0 |

OCM operational reports are **STATIC** or **STALE**, not real-time. BEE, Delhi/DTL and OSM inventory do not establish live availability. `sync:status` explicitly skips both active sources and preserves unknown availability. Authorized live feeds have provider-specific intervals and timestamp/precedence checks. Live connector/station observations require an enabled live-capable provider. A disposable PostGIS database verifies live TTL, precedence, expiring manual corrections, provider history and failure retention without inserting synthetic observations into the application database.

## Final quality gate

| Check | Result / evidence |
|---|---|
| PostgreSQL | PASS — actual PostgreSQL 18.6 |
| PostGIS | PASS — actual PostGIS 3.6; real radius queries |
| `GET /api/v1/stations` | PASS — total equals database |
| `GET /api/v1/stations/nearby` | PASS — all four Delhi radii equal database |
| `GET /api/v1/cities` | PASS — real aggregations; eight city consistency checks |
| Frontend | PASS — root and independent package production browsers; real home counts |
| Map | PASS — India, Mumbai, Hyderabad, Delhi; 100 real station markers per requested result page |
| Scheduler | PASS — installed launchd timer; immediate and due-only worker execution |
| Weekly ingestion | PASS — forced real provider run through archive, database, cache invalidation and report |
| Status refresh | PASS — honest static-provider skip; authorized live path verified in disposable database |
| Manual administration | PASS — protected CLI search and disposable-database override/history/expiry tests |
| Failure recovery | PASS — timeout/retry 429/5xx, invalid/partial response, database outage, Redis failure, object-store fallback, independent provider failure |
| Tests | PASS — 26 suites, 289 tests |
| Typecheck | PASS — `npm run typecheck` |
| Lint | PASS — no errors or warnings |
| Root production build | PASS — isolated `.next-production` build |
| Independent frontend production build | PASS — isolated frontend `.next-production` build |
| Browser API outage / Retry | PASS — connection error, no false zero inventory, real markers return after Retry |
| Drizzle schema generation | PASS — no pending schema changes |
| Knowledge graph | Updated with AST extraction; SQL graph parser unavailable, not a database validation failure |

Browser checks at ports 3002 and 3003 produced zero page errors across home, Mumbai, Hyderabad, Delhi and all four map views. Maps intentionally render a bounded API result page, not all 30,811 stations at once. Provider authorization, national source completeness and administrative labels are not inferred from these checks.

Local evidence: `.ingestion/reports/database-verification.json`, research identity audit, per-run JSON reports, PostgreSQL `ingestion_runs`, `data_quality_issues`, private raw archives, and `/tmp/fastcharger-browser-report-3002.json` / `3003.json`. Reproduce using [the operations guide](data-ingestion.md). The pre-activation database backup is in ignored local staging.

## Git protection

The 180,481,865-byte `bee-pcs.xml` and all generated/raw datasets remain on disk, ignored. The earlier unpublished raw-data commit is preserved in a local-only backup branch and excluded from the current branch being pushed. No published history is rewritten and no force push is used. Source, adapters, migrations, tests, configuration and documentation are included in one meaningful feature commit; the final response records its SHA after remote verification.
