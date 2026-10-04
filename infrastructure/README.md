# FastCharger Infrastructure

This directory contains local and deployment infrastructure specifications for FastCharger services.

## Local Infrastructure (PostgreSQL + PostGIS)

Local development relies on PostgreSQL 16 with PostGIS 3.4 enabled.

### Quick Start with Docker Compose

To start the local database container:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

To stop the container:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

### Connection Details

- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `fastcharger`
- **Connection URL**: `postgresql://postgres:postgres@localhost:5432/fastcharger`

Ensure this matches the `DATABASE_URL` configured in `.env.local` for the backend and database migration tasks.
