# Charging data operations

Production data follows the existing worker: provider → raw archive → validation → normalization → identity resolution → PostgreSQL/PostGIS → Hono API → frontend. The research export is an input, never a React data source. Coverage is provider-reported and provisional, not a claim to include every Indian station or a field verification of station existence.

## Initial activation

Protect server credentials in environment or `.env.local`. Start PostgreSQL with PostGIS and the backend (`npx tsx backend/src/server.ts`).

```sh
npm run data:migrate
npm run data:profile
npm run import:research-stations
npm run sync:ocm
```

The import defaults to `research/ev-india/datasets/india-master.csv`, with per-source evidence in the adjacent `station-sources.csv`. `RESEARCH_STATIONS_FILE` overrides the master CSV path. Stage these files privately on the worker; they are deliberately excluded from Git. Dataset regeneration scripts remain under `research/ev-india/`; they use saved evidence and must not be mistaken for production live feeds.

Records without validated India-envelope coordinates are quarantined in `data_quality_issues`, with original data retained in the raw archive. The envelope check is not an Indian administrative boundary validation. Coordinate duplicates and shared names alone do not prove identity. Explicit research provenance and existing provider identities are retained; ambiguous nearby candidates remain separate and require review. The research NCR rectangle (28.2–29.1 latitude, 76.8–77.7 longitude) is not the statutory NCR boundary.

Station and connector upserts use scoped provider identities. A real transaction rolls back canonical mutations on database failure. Slugs and existing canonical station IDs are retained. Connector rows without provider IDs use deterministic source-site/connector-position keys; providers without durable connector IDs cannot establish physical connector equivalence across other sources. Research IDs and BEE-derived site hashes are snapshot/site identifiers, not fabricated official BEE IDs.

## Providers and access

The registry is `worker/src/providers/registry.ts`, persisted in `providers`. New deployments initialize it with `npm run sync:providers` or the initial import command. Update `enabled`, `refresh_interval_seconds`, and `status_interval_seconds` in PostgreSQL to set provider-specific schedules. Registry bootstrapping does not overwrite existing operator settings.

| Provider | Acquisition | Operation / availability | Credentials and access |
| --- | --- | --- | --- |
| Open Charge Map | Official India API | Static reported operation; availability unknown | `OCM_API_KEY` (legacy `OPENCHARGEMAP_API_KEY` accepted); key sent server-side in a header. Community CC BY 4.0, imported-provider licenses retained. |
| BEE | Official downloadable PDF | Static inventory; availability unknown | Public download; pypdf and Poppler needed for audited table extraction. No working authorized developer API endpoint established. Public access does not establish an unrestricted redistribution license. |
| Delhi EV / Delhi Transco | Existing official evidence, controlled manual import | Static inventory | Automated refresh disabled pending a permitted machine-readable feed. |
| OpenStreetMap | Existing research import | Secondary inventory evidence | ODbL attribution; no live status inferred. |
| Jio-bp, Tata Power, ChargeZone, Statiq, Zeon, Ather, Kazam, Bolt.Earth, Fortum, ChargeGrid, EESL | Disabled | Capabilities unverified | `ACCESS_REQUIRED`; obtain authorized endpoint, credentials, terms, rate limits and station/status schema. No private-API scraping. |
| ChargeIndia OCPI | Disabled | Authorized integration may supply status | Commercial agreement and OCPI credentials required. |

BEE policy describes future/open third-party access, but is not itself an executable API specification: [Ministry/BEE guidelines](https://www.beeindia.gov.in/sites/default/files/Guidelines%20and%20Standards%20for%20EVCI%20dated%2017-09-2024_compressed.pdf). The PDF adapter uses the specific verified publication in `BeeProvider`; operations must update the adapter when BEE publishes a new dataset URL. It does not claim automatic discovery of all future publications. [OCM terms](https://openchargemap.org/develop) require visible attribution. [ChargeIndia onboarding](https://docs.hub.chargeindia.com/getting-started) requires commercial credentials.

## Weekly and status refresh

```sh
npm run sync:providers           # only due metadata providers
npm run sync:providers -- --now  # exercise full provider refresh immediately
npm run sync:bee                 # download/extract official PDF
npm run sync:status              # due, authorized status adapters only
npm run data:scheduled -- --now  # complete scheduler path immediately
```

`npm run data:scheduler:install` installs `com.fastcharger.data-refresh` in the current Mac user's LaunchAgents. It wakes every 900 seconds; metadata intervals default to 604800 seconds. macOS must be awake and the account logged in. Linux deployment uses `infrastructure/data-refresh.cron` with the actual checkout path; no Kubernetes or GitHub-hosted access to a local database is assumed. Protected credentials remain on the worker host. To uninstall on macOS:

```sh
launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/com.fastcharger.data-refresh.plist"
```

The scheduler locks concurrent executions. A failed provider is recorded independently; later providers continue. Failed jobs do not update `last_successful_sync_at`, allowing retry at the next scheduler wake. Persistent failures should alert operators; logs are `.ingestion/scheduler.log` and `scheduler-errors.log`. No authorized live provider exists in this workspace; status refresh records an explicit skip and never changes availability to available/unavailable. Authorized adapters implement optional `fetchStatuses()` and are registered with provider capabilities and provider-specific intervals before enabling.

## Reconciliation and recovery

Every provider run has a row in `sync_logs`; `ingestion_runs` is its operational view. Counters distinguish new, changed, unchanged, rejected, duplicate, missing and status observations. `source_errors` exposes failed runs. Detailed reports are written under `.ingestion/reports/`. PostgreSQL is authoritative if Redis, MongoDB or object storage fails. MongoDB remains a failure-isolated operational event layer, not station storage.

OCM requests have bounded retry/backoff for 429/5xx and network failure, a request timeout, schema validation and a result-cap completeness flag. A capped snapshot is never used to mark missing records; operators must use verified geographic-cell collection or obtain a complete feed before reconciling removal. BEE downloads have bounded retries/timeouts, PDF signature validation, audited extraction and error tracking. No API timeout is interpreted as an empty dataset.

Only complete, identifiable, nonempty snapshots can mark provider identities absent. Known IDs with invalid coordinates still count as seen, while their canonical coordinates are preserved. A missing identity is flagged, never deleted. Only stations missing from every associated source move to `MISSING_FROM_SOURCE`; missing data does not establish decommissioning. `STALE`, `POSSIBLY_REMOVED`, and `DECOMMISSIONED` require operational review/evidence rather than fabricated inference. Authorized manual decommissioning is explicit and auditable.

Before migration/import, take a `pg_dump -Fc` using a client matching the server version. A local backup for this activation is retained in ignored `.ingestion/backups/`. Recover in an isolated database first, then use a controlled cutover; do not blindly replay old research schema SQL into the application database. Apply application migrations with `npm run data:migrate`; `research/ev-india/schema.sql` is a research design only. Retain canonical history instead of deleting stations during provider outages.

## Status semantics and manual correction

`status_observations` is append-only history. `station_status` and `connector_status` calculate precedence/freshness at query time. Unknown static reports cannot overwrite a known operational report. Fresh availability outranks stale availability; fresh lower-priority evidence can supersede an expired higher-priority observation. Static sources cannot create availability observations, and PostgreSQL requires an enabled live-capable provider. Future observations are rejected.

Operational status is `OPERATIONAL`, `NON_OPERATIONAL`, `TEMPORARILY_UNAVAILABLE`, `DECOMMISSIONED`, or `UNKNOWN`. Availability is separately `AVAILABLE`, `PARTIALLY_AVAILABLE`, `UNAVAILABLE`, `UNKNOWN`, or `STALE`. Operational reports do not establish current connector availability. Confidence for uncalibrated inventory is stored as zero with an explicit uncalibrated note, not an invented accuracy score. Authorized status feed confidence is supplied by its adapter.

The admin CLI is server-only and protected by OS access and PostgreSQL credentials. It never exposes an unauthenticated browser mutation endpoint:

```sh
npm run data:admin -- search "station name"
npm run data:admin -- history <station-uuid>
npm run data:admin -- set <station-uuid> TEMPORARILY_UNAVAILABLE "inspection reason" "2030-01-01T00:00:00Z"
```

Use a real expiry appropriate to the correction; the date above is a syntax example. Supported corrections: `ACTIVE`, `INACTIVE`, `TEMPORARILY_UNAVAILABLE`, `DECOMMISSIONED`, `UNKNOWN`. The CLI records the actual OS user, previous/effective status, reason and timestamps. The latest override may expire, after which provider-derived operational status resumes. Provider observations are never overwritten. An operational override does not fabricate live availability.

## Archives, cache and provenance

The existing S3/R2/MinIO abstraction archives raw normalized provider input. With no storage configuration it uses durable local staging; on object-storage failure it retains a local fallback and records metadata/checksum in `object_metadata`. Original BEE PDFs are also retained locally before extraction. Production local staging needs a persistent volume, backup and retention maintenance. It is not safe to use ephemeral container disks as the only archive.

Provider mappings retain provider ID, source classification, record ID, source URL, original timestamps, ingestion-run reference, evidence/attribution, and payload hash. OCM and BEE IDs stay distinct while mapping to one station when identity is corroborated. Raw payloads, datasets, large XML and backups remain ignored. Legacy synthetic seed rows are quarantined in `quarantined_station_records`, including original stations, connectors and quality records. Only exact fixture matches without provider mappings or status history qualify; acquired source records never qualify. `npm run data:quarantine-fixtures` is safe to repeat, and both old seed commands reject application databases.

The old unpublished raw-data commit is retained only as a local backup ref; the current branch sent to Git excludes its payloads.

Redis invalidation uses the real node-redis client when `REDIS_URL` is configured, including SCAN for pattern keys. When Redis is absent it reports a skip, and backend reads still query PostgreSQL. MongoDB outage cannot cancel canonical ingestion. Frontend pages fetch the Hono API; browser requests can use same-origin Next rewrites. `API_URL` is server-only; optional `NEXT_PUBLIC_API_URL` is only a public API origin. Provider/database credentials never enter browser bundles. HTTP/database failures surface errors, not zero station counts.

## Verification

```sh
npm test                  # includes disposable PostGIS database integration tests
npm run typecheck
npm run lint
FASTCHARGER_BUILD_DIR=.next-production npm run build
npm run data:verify
```

Tests require PostgreSQL and permission to create/drop a disposable test database; synthetic fixtures never enter the application station database. City consistency tests compare real API aggregations to real database counts. Re-run the same input and verify both station and connector totals remain unchanged. Query `stations`, `connectors`, `station_provider_mappings`, `station_status`, and `ingestion_runs`; test Delhi nearby at 1/5/10/25 km and verify city summaries against list pagination and map results. The verification report distinguishes measured source coverage from unresolved identity candidates and unknown live status.
