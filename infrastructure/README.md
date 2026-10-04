# FastCharger Infrastructure

This directory contains local and deployment infrastructure specifications for FastCharger services.

## Local Infrastructure

Local development uses Docker Compose to provision:
1. **PostgreSQL 16 + PostGIS 3.4**: Sole authoritative source of truth for canonical business and geographic data.
2. **MongoDB 7.0**: Flexible operational event, search analytics, and audit logging store (strictly non-authoritative).
3. **MinIO (S3-Compatible Object Storage)**: Local development store for raw provider responses, dumps, and reports.

### Quick Start with Docker Compose

To start local containers:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

To stop containers:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

### Connection Details

#### 1. PostgreSQL (Canonical Business & PostGIS Geographic Engine)
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `fastcharger`
- **Connection URL**: `postgresql://postgres:postgres@localhost:5432/fastcharger`

#### 2. MongoDB (Flexible Event & Operational Store)
- **Host**: `localhost`
- **Port**: `27017`
- **User**: `admin`
- **Password**: `password`
- **Database**: `fastcharger_events`
- **Connection URL**: `mongodb://admin:password@localhost:27017/fastcharger_events?authSource=admin`

#### 3. MinIO (S3-Compatible Object Storage)
- **API Host**: `localhost`
- **API Port**: `9000` (`http://localhost:9000`)
- **Console Port**: `9001` (`http://localhost:9001`)
- **Access Key**: `minioadmin`
- **Secret Key**: `minioadmin`
- **Default Bucket**: `fastcharger-raw`
