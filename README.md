# FastCharger — EV charging station discovery for India

Search charging stations by city, state, PIN code or nearby coordinates. The project includes a Next.js frontend, standalone Hono backend, PostgreSQL/PostGIS schema, ingestion workers and a versioned real-data snapshot.

**A clone includes the code and station datasets. No provider API key is needed to load the bundled snapshot.** Node.js and a PostgreSQL/PostGIS server are still required; setup installs the data into that server.

## 1. Quick start

Install Git and **Node.js 22 or newer**, including npm. For the easiest database setup, install and start Docker Desktop (or Docker Engine with Compose on Linux).

```bash
git clone https://github.com/07anishu12/ev-charging-station-locator.git
cd ev-charging-station-locator
npm ci
npm run setup
npm run dev
```

Open **http://localhost:3000**. The backend runs at **http://localhost:4000**.

Setup creates `.env.local` from `.env.example` if no environment file or supplied `DATABASE_URL` exists. It starts the documented local PostgreSQL/PostGIS Docker service when needed, applies migrations, verifies dataset checksums and imports the full snapshot into an empty database. Existing configuration, keys and populated station databases are preserved.

The frontend and backend run as Node processes. Only PostgreSQL/PostGIS needs Docker for this path. MongoDB, Redis and MinIO are optional for basic discovery.

Cloning, installing dependencies and the first Docker image download need internet access. Snapshot loading does not contact provider APIs. Map tiles need internet access.

### Without Docker

Use a native or hosted PostgreSQL server with PostGIS installed. After cloning and `npm ci`, create a root `.env.local` using `.env.example` as the template. Set `DATABASE_URL` to an empty database on your server, then run `npm run setup` and `npm run dev`.

The database user needs permission to apply migrations and enable PostGIS. If your provider manages extensions separately, enable PostGIS through the provider first. A custom connection URL uses that database without starting Docker.

## 2. Your three application commands

Run commands from the repository root:

| Command | Starts | Address |
| --- | --- | --- |
| `npm run backend` | Backend API after checking database/schema/data | `http://localhost:4000/health/db` |
| `npm run frontend` | Frontend; start the backend separately | `http://localhost:3000` |
| `npm run dev` | Backend, waits for readiness, then frontend | `http://localhost:3000` |

Use `backend` and `frontend` in separate terminals, or `dev` in one terminal. Ctrl+C stops the processes started by that command. `npm run` alone lists scripts and does not launch the application.

Browser requests use the frontend's `/api/v1/*` proxy. To open the app from another device, use this computer's LAN address on port 3000 and allow access through your firewall. Requests do not point at each visitor's own `localhost`.

## 3. What GitHub includes

| Included | Location |
| --- | --- |
| Active frontend, styles and components | Root `app/`, `components/`, `lib/` |
| Backend routes, validation, services and repositories | `backend/src/` |
| Database schema and migrations | `database/` |
| Ingestion, normalization, reconciliation and refresh jobs | `worker/` |
| Shared contracts, types and geographic references | `shared/` |
| Ready-to-load canonical dataset | `data/snapshot/india-charging.json.gz` |
| Snapshot counts, date, checksum and migration version | `data/snapshot/manifest.json` |
| All ten research exports and record-level attribution | `research/ev-india/datasets/` |
| Research file inventory, checksums and CSV row counts | `data/research-manifest.json` |
| Run/setup/verification scripts and dependency lockfile | `scripts/`, `package.json`, `package-lock.json` |

Research exports include India master CSV and GeoJSON, Delhi/NCR master, station sources, summary, source quality, match candidates, coordinate quarantine, identity conflicts and address discovery queue. Rejected/unresolved records remain in the research exports; the canonical snapshot contains discoverable stations after ingestion and reconciliation.

The snapshot exported on **13 October 2026** contains:

| Dataset | Records |
| --- | ---: |
| Discoverable stations | 30,812 |
| Connectors | 34,296 |
| States / union territories | 36 |
| Stored cities | 5,955 |
| Cities with stations | 5,288 |
| Stored operators | 241 |
| Operators referenced by stations | 239 |
| PIN codes | 1,073 |
| Provider mappings | 32,467 |

Districts, city aliases, provider configuration, ingestion history, status observations and quality records are also included. Exact counts for all restored tables are in the manifest. Migrations recreate PostgreSQL views such as `station_status`.

**Private environment files/API keys, installed dependencies, local database volumes, build output, logs, raw downloaded provider webpages and temporary ingestion archives are excluded.** They are not required to use the distributed dataset. `npm ci` recreates dependencies; migrations recreate the schema; setup loads the snapshot.

## 4. Your API key and future refreshes

The owner's API key stays in the owner's private `.env.local` or deployment secret store. It is not committed, embedded in the frontend, or distributed to people cloning this repository. The bundled snapshot works without it.

For a live Open Charge Map refresh, privately configure an authorized `OCM_API_KEY` (or `OPENCHARGEMAP_API_KEY`) and run:

```bash
npm run sync:ocm
```

This refreshes the OCM source, not every provider. The adapter caps each request at 10,000 results; a successful bounded request alone does not prove complete India coverage. The research grid collector can audit saturated cells.

| Command | Purpose / prerequisite |
| --- | --- |
| `npm run sync:bee` | BEE source import; needs Python 3, `pypdf` and Poppler's `pdftotext` |
| `npm run import:research-stations` | Import the bundled research CSV or configured `RESEARCH_STATIONS_FILE` |
| `npm run data:scheduled` | Run scheduled provider work once; authorization and due intervals apply |
| `npm run sync:providers -- --now` | Force the existing scheduled provider refresh path |
| `npm run data:export-snapshot` | Maintainer: export a consistent snapshot locally; does not push it |
| `npm run data:check-snapshot` | Verify snapshot, schema version and research export checksums |

Snapshot restoration is transactional and requires empty canonical tables. It never overwrites an existing installation. Setup skips importing when stations already exist. An explicit `RESEARCH_STATIONS_FILE` selects a research import instead of the snapshot. Use ingestion commands to update existing data.

To distribute a new dataset release: refresh authorized sources, review quality, export the snapshot, update research files and their manifest, validate on a fresh database, then commit the dataset changes. A Git pull downloads dataset files; it does not automatically overwrite someone's populated database.

## 5. Configuration

Use the root `.env.local`; do not commit it.

| Variable | Default / purpose |
| --- | --- |
| `DATABASE_URL` | Docker example: `postgresql://postgres:postgres@127.0.0.1:5432/fastcharger` |
| `API_URL` | Server-only backend destination; example `http://127.0.0.1:4000` |
| `NEXT_PUBLIC_SITE_URL` | Frontend canonical URL; example `http://localhost:3000` |
| `BACKEND_PORT` / `FRONTEND_PORT` | Default 4000 / 3000; update explicit `API_URL` when changing backend port |
| `OCM_API_KEY` / `OPENCHARGEMAP_API_KEY` | Optional private key for future OCM refresh |
| `RESEARCH_STATIONS_FILE` | Optional alternate real research CSV |

`NEXT_PUBLIC_API_URL` remains a legacy proxy destination fallback. Prefer server-only `API_URL`. Never put database/provider secrets in `NEXT_PUBLIC_*` variables.

The `frontend/` package's run/build scripts delegate to the active root Next.js application. `backend/` dev delegates to the root launcher. Install dependencies once at the root.

## 6. Verification

With the app running:

```bash
curl http://localhost:4000/health/db
curl http://localhost:3000/api/v1/statistics
curl "http://localhost:3000/api/v1/stations?pageSize=2"
```

The distributed snapshot should report 30,812 stations. With the app stopped, `node scripts/verify-checkout.mjs` starts both services, verifies health, API counts and the homepage, then stops them.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For the full test suite, keep the backend running: some tests compare live API results with the database. Fixture tests isolate their configuration. `node scripts/verify-checkout.mjs --test` runs the suite while its own frontend/backend are running, then stops them.

The **Fresh checkout** GitHub Actions workflow uses a clean Ubuntu runner, Node 22 and PostgreSQL 16/PostGIS 3.4. It installs from the lockfile, checks dataset integrity, restores without an API key, reruns setup, starts both services, checks the API/homepage and runs code validation. See **Actions → Fresh checkout** for executed results.

## 7. Troubleshooting

| Symptom | Action |
| --- | --- |
| Docker socket unavailable | Start Docker Desktop/Engine, or configure a native/hosted PostGIS database |
| Cannot connect to PostgreSQL | Check database process, port, credentials and `DATABASE_URL` |
| PostGIS unavailable / extension error | Enable/install PostGIS, or use the supplied PostGIS Docker image |
| Schema missing | Run `npm run setup` |
| No station records | Run setup and confirm `data/snapshot/` was downloaded |
| Snapshot integrity check failed | Restore data/manifest files from the same Git revision; do not bypass checks |
| Port occupied | Stop the existing app or change ports and the matching `API_URL` |
| Charging data unavailable | Start the backend or use `npm run dev`; check `/health/db` |
| Restore detects populated canonical tables | Use an empty database for snapshot restore or research import for existing data |

## 8. Work completed and work remaining

**Completed:** separate and combined commands; database/data readiness diagnostics; same-origin API routing; transactional snapshot export/restore; versioned datasets with attribution/checksums; clean-checkout verification; controlled behavior during API outages.

**Public launch still requires:** frontend/backend hosting, a production PostGIS database, HTTPS and private environment configuration, authorized scheduled refreshes, source-license/data-quality review, health monitoring and backups. Operator feeds are required for live availability. The snapshot is a dated inventory; it does not guarantee every charger in India is listed or available now.

See [data/DATA_SOURCES.md](data/DATA_SOURCES.md) for attribution and license limitations, and `docs/` for schema/architecture notes.
