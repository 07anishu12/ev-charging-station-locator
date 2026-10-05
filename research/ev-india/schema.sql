-- Standalone design, not an application migration. Never run against production blindly.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA ev_inventory;
SET search_path TO ev_inventory, public;

CREATE TABLE sources (
  id text PRIMARY KEY,
  organization text NOT NULL,
  evidence_class text NOT NULL CHECK (evidence_class IN ('VERIFIED','DOCUMENTED','OBSERVED','INFERRED','UNVERIFIED')),
  automation_permission text NOT NULL CHECK (automation_permission IN ('allowed','contract_required','prohibited','unknown')),
  license text,
  inventory_priority integer NOT NULL CHECK (inventory_priority > 0),
  status_priority integer NOT NULL CHECK (status_priority > 0),
  freshness_class text NOT NULL CHECK (freshness_class IN ('REALTIME','NEAR_REALTIME','PERIODIC','STATIC','UNKNOWN')),
  status_ttl_seconds integer CHECK (status_ttl_seconds > 0),
  status_timestamps_verified boolean NOT NULL DEFAULT false
);

CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  aliases text[] NOT NULL DEFAULT '{}',
  country char(2),
  website text
);

CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name text,
  operator_id uuid REFERENCES operators,
  latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  geom geometry(Point,4326) GENERATED ALWAYS AS (
    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint(longitude,latitude),4326) END
  ) STORED,
  address text, city text, district text, state text, pincode text,
  country char(2) NOT NULL DEFAULT 'IN',
  access_type text NOT NULL DEFAULT 'unknown',
  inventory_status text NOT NULL DEFAULT 'listed',
  identity_status text NOT NULL DEFAULT 'PROVISIONAL',
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  confidence_score numeric CHECK (confidence_score BETWEEN 0 AND 1),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX stations_geom_gist ON stations USING gist (geom);
CREATE INDEX stations_geography_gist ON stations USING gist ((geom::geography));
CREATE INDEX stations_region_idx ON stations (state, district, city);

CREATE TABLE ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL REFERENCES sources,
  scope jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result text NOT NULL DEFAULT 'running',
  dataset_date date,
  publication_date date,
  source_authority text,
  source_last_update timestamptz,
  request_count integer NOT NULL DEFAULT 0,
  raw_record_count integer NOT NULL DEFAULT 0,
  normalized_record_count integer NOT NULL DEFAULT 0,
  rejected_record_count integer NOT NULL DEFAULT 0,
  saturated_cells jsonb NOT NULL DEFAULT '[]',
  coverage_complete boolean NOT NULL DEFAULT false,
  manifest_hash text
);

CREATE TABLE raw_ingestion (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs,
  source_record_id text,
  response_sha256 text NOT NULL,
  payload jsonb,
  artifact_path text,
  request_metadata jsonb NOT NULL,
  http_status integer,
  semantic_success boolean NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payload IS NOT NULL OR artifact_path IS NOT NULL)
);

CREATE TABLE station_sources (
  station_source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  source_station_id text NOT NULL,
  provider_station_id text,
  provider text,
  source_url text NOT NULL,
  raw_payload_hash text NOT NULL,
  raw_ingestion_id bigint REFERENCES raw_ingestion,
  source_record_ids text[] NOT NULL DEFAULT '{}',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  source_updated_at timestamptz,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  dataset_date date,
  match_class text NOT NULL CHECK (match_class IN ('MATCHED','PROBABLE_MATCH','POSSIBLE_MATCH','SEPARATE','UNKNOWN')),
  match_features jsonb NOT NULL DEFAULT '{}',
  UNIQUE (source,source_station_id)
);

CREATE TABLE evses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  source_evse_uid text NOT NULL,
  evse_id text,
  ocpi_country_code char(2),
  ocpi_party_id char(3),
  source_updated_at timestamptz,
  UNIQUE (source,source_evse_uid),
  UNIQUE (id,station_id)
);

CREATE TABLE connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations,
  evse_id uuid,
  source text NOT NULL REFERENCES sources,
  source_connector_id text,
  connector_type text,
  standard text,
  current_type text CHECK (current_type IN ('AC','DC','UNKNOWN')),
  power_kw numeric CHECK (power_kw >= 0),
  voltage numeric CHECK (voltage >= 0),
  amperage numeric CHECK (amperage >= 0),
  quantity integer CHECK (quantity > 0),
  inventory_status text,
  FOREIGN KEY (evse_id,station_id) REFERENCES evses (id,station_id),
  UNIQUE (source,evse_id,source_connector_id),
  UNIQUE (id,station_id)
);
-- Null EVSE/connector IDs mean an inventory aggregate, not invented physical EVSEs.

CREATE TABLE station_status (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  status text NOT NULL CHECK (status IN ('available','occupied','charging','faulted','offline','unknown','out_of_service')),
  source_status_timestamp timestamptz NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric CHECK (confidence BETWEEN 0 AND 1),
  raw_status jsonb NOT NULL,
  raw_ingestion_id bigint REFERENCES raw_ingestion,
  UNIQUE (station_id,source,source_status_timestamp)
);

CREATE TABLE connector_status (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id uuid NOT NULL REFERENCES stations,
  connector_id uuid NOT NULL,
  source text NOT NULL REFERENCES sources,
  status text NOT NULL CHECK (status IN ('available','occupied','charging','faulted','offline','unknown','out_of_service')),
  source_status_timestamp timestamptz NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  confidence numeric CHECK (confidence BETWEEN 0 AND 1),
  raw_status jsonb NOT NULL,
  raw_ingestion_id bigint REFERENCES raw_ingestion,
  FOREIGN KEY (connector_id,station_id) REFERENCES connectors (id,station_id),
  UNIQUE (connector_id,source,source_status_timestamp)
);
CREATE INDEX connector_status_latest_idx ON connector_status (connector_id,source_status_timestamp DESC);

CREATE FUNCTION guard_live_status() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE configured sources%ROWTYPE;
BEGIN
  SELECT * INTO STRICT configured FROM sources WHERE id=NEW.source;
  IF NOT configured.status_timestamps_verified
     OR configured.freshness_class NOT IN ('REALTIME','NEAR_REALTIME')
     OR configured.status_ttl_seconds IS NULL
     OR configured.automation_permission <> 'allowed' THEN
    RAISE EXCEPTION 'Source % not authorized and verified for timestamped live status', NEW.source;
  END IF;
  IF NEW.source_status_timestamp > NEW.observed_at + interval '2 minutes' THEN
    RAISE EXCEPTION 'Future source status timestamp';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_station_live BEFORE INSERT OR UPDATE ON station_status FOR EACH ROW EXECUTE FUNCTION guard_live_status();
CREATE TRIGGER guard_connector_live BEFORE INSERT OR UPDATE ON connector_status FOR EACH ROW EXECUTE FUNCTION guard_live_status();

CREATE VIEW current_connector_status AS
SELECT c.id AS connector_id,c.station_id,
       COALESCE(selected.status,'unknown') AS live_status,
       selected.source,selected.source_status_timestamp,
       extract(epoch FROM (now()-selected.source_status_timestamp)) AS freshness_seconds
FROM connectors c
LEFT JOIN LATERAL (
  SELECT cs.* FROM connector_status cs JOIN sources src ON src.id=cs.source
  WHERE cs.connector_id=c.id AND src.automation_permission='allowed'
    AND src.status_timestamps_verified AND src.status_ttl_seconds IS NOT NULL
    AND src.freshness_class IN ('REALTIME','NEAR_REALTIME')
    AND cs.source_status_timestamp >= now()-make_interval(secs=>src.status_ttl_seconds)
    AND cs.source_status_timestamp <= now()+interval '2 minutes'
  ORDER BY src.status_priority,cs.source_status_timestamp DESC,cs.observed_at DESC
  LIMIT 1
) selected ON true;

CREATE TABLE tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL REFERENCES sources,
  source_tariff_id text,
  station_id uuid REFERENCES stations,
  currency char(3),
  elements jsonb NOT NULL,
  tax_included boolean,
  valid_from timestamptz, valid_to timestamptz,
  source_updated_at timestamptz,
  UNIQUE (source,source_tariff_id)
);

CREATE TABLE station_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  raw_hours text,
  schedule jsonb,
  valid_from timestamptz
);

CREATE TABLE station_amenities (
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  amenity text NOT NULL,
  verified_at timestamptz,
  PRIMARY KEY (station_id,source,amenity)
);

CREATE TABLE station_evidence (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id uuid NOT NULL REFERENCES stations,
  source text NOT NULL REFERENCES sources,
  attribute text NOT NULL,
  value jsonb NOT NULL,
  source_url text NOT NULL,
  source_record_id text,
  source_updated_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  dataset_date date,
  raw_ingestion_id bigint REFERENCES raw_ingestion
);

CREATE TABLE source_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ingestion_run_id uuid REFERENCES ingestion_runs,
  source text NOT NULL REFERENCES sources,
  source_record_id text,
  error_class text NOT NULL,
  http_status integer,
  message text NOT NULL,
  retry_after timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE match_candidates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  left_source_id uuid NOT NULL REFERENCES station_sources,
  right_source_id uuid NOT NULL REFERENCES station_sources,
  classification text NOT NULL CHECK (classification IN ('MATCHED','PROBABLE_MATCH','POSSIBLE_MATCH','SEPARATE','UNKNOWN')),
  distance_m numeric CHECK (distance_m >= 0),
  features jsonb NOT NULL,
  reviewed_by text, reviewed_at timestamptz,
  UNIQUE (left_source_id,right_source_id),
  CHECK (left_source_id <> right_source_id)
);
