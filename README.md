# FastCharger

FastCharger is a mobile-first foundation for discovering EV charging stations across India.

> Find your next charging stop.

Phase 1 establishes the Next.js App Router architecture, provider boundary, PostGIS schema, validation, design tokens, placeholder routes, and test foundation. It intentionally does not include production station data or the complete discovery UI.

## Stack

- Next.js 16 + TypeScript + App Router
- Tailwind CSS 4
- PostgreSQL + PostGIS
- Drizzle ORM
- Leaflet boundary for the map phase
- Zod validation
- Vitest

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at <http://localhost:3000>.

### Environment

| Variable | Server/browser | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Server only | PostgreSQL connection string with PostGIS enabled |
| `OPENCHARGEMAP_API_KEY` | Server only | Open Charge Map ingestion access |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site URL; defaults to `http://localhost:3000` |

`OPENCHARGEMAP_API_KEY` is read only by the server-side provider implementation and is never imported by client components.

## Commands

```bash
npm run dev          # local development
npm run build        # production build
npm run start        # serve a production build
npm run lint         # ESLint
npm test             # Vitest test run
npm run test:watch   # Vitest watch mode
npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # apply migrations; requires DATABASE_URL and PostGIS
```

## Architecture

```text
Open Charge Map
      ↓
services/providers + services/ingestion
      ↓
services/normalization
      ↓
PostgreSQL + PostGIS (lib/db, drizzle/)
      ↓
services/stations
      ↓
Next.js API routes
      ↓
Next.js frontend
```

The frontend talks only to the application API. It has no dependency on Open Charge Map.

## Routes

- `/`
- `/india`
- `/india/[state]`
- `/india/[state]/[city]/ev-charging-stations`
- `/india/[state]/[city]/[pincode]/ev-charging-stations`
- `/station/[slug]`

API placeholders:

- `GET /api/stations`
- `GET /api/stations/nearby`
- `GET /api/stations/[id]`
- `GET /api/cities`
- `GET /api/cities/[slug]`
- `GET /api/search`
- `GET /api/pincodes/[pincode]`

Collection endpoints currently return empty, typed result sets. No fake charger records are seeded.

## Project conventions

- `lib/config` is the central configuration boundary.
- `lib/api/validation.ts` owns request schemas; invalid requests return a consistent error envelope.
- Server-only provider/database code imports `server-only` and never crosses into client components.
- `app/globals.css` contains FastCharger color tokens and reduced-motion-safe animation utilities.
- The first migration in `drizzle/` enables PostGIS and creates the station location index without inserting data.
