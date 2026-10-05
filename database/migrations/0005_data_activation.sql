ALTER TABLE stations ADD COLUMN research_canonical_id uuid UNIQUE,
 ADD COLUMN lifecycle_state text NOT NULL DEFAULT 'ACTIVE',
 ADD COLUMN last_seen_at timestamptz, ADD COLUMN last_provider_update_at timestamptz;
ALTER TABLE stations ADD CONSTRAINT lifecycle_valid CHECK (lifecycle_state IN ('ACTIVE','STALE','MISSING_FROM_SOURCE','POSSIBLY_REMOVED','DECOMMISSIONED'));
ALTER TABLE station_provider_mappings ADD COLUMN source_type text NOT NULL DEFAULT 'OTHER_LICENSED_PROVIDER',
 ADD COLUMN source_url text, ADD COLUMN source_updated_at timestamptz,
 ADD COLUMN first_seen_at timestamptz NOT NULL DEFAULT now(), ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN ingestion_run_id uuid REFERENCES sync_logs(id), ADD COLUMN missing_from_snapshot boolean NOT NULL DEFAULT false,
 ADD COLUMN payload_hash text;
ALTER TABLE connectors ADD COLUMN provider_name text, ADD COLUMN provider_connector_id text;
UPDATE connectors SET provider_name='open-charge-map',provider_connector_id=ocm_connection_id::text WHERE ocm_connection_id IS NOT NULL;
CREATE UNIQUE INDEX connector_provider_identity_idx ON connectors(station_id,provider_name,provider_connector_id);
ALTER TABLE sync_logs ADD COLUMN records_unchanged integer NOT NULL DEFAULT 0,
 ADD COLUMN records_missing integer NOT NULL DEFAULT 0, ADD COLUMN status_updates integer NOT NULL DEFAULT 0,
 ADD COLUMN full_snapshot boolean NOT NULL DEFAULT false;
CREATE VIEW ingestion_runs AS SELECT * FROM sync_logs;
CREATE TABLE providers (
 provider_id text PRIMARY KEY, provider_name text NOT NULL, provider_type text NOT NULL,
 enabled boolean NOT NULL DEFAULT false, provider_status text NOT NULL,
 supports_station_data boolean NOT NULL, supports_status_data boolean NOT NULL,
 supports_connector_data boolean NOT NULL, supports_pricing boolean NOT NULL,
 supports_live_availability boolean NOT NULL, refresh_interval_seconds integer NOT NULL CHECK(refresh_interval_seconds > 0),
 status_interval_seconds integer CHECK(status_interval_seconds > 0), terms_notes text NOT NULL,
 last_successful_sync_at timestamptz, last_status_sync_at timestamptz
);
CREATE TABLE status_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), station_id uuid NOT NULL REFERENCES stations(id),
 connector_id uuid REFERENCES connectors(id), status_kind text NOT NULL CHECK(status_kind IN ('OPERATIONAL','AVAILABILITY')),
 status text NOT NULL, source_provider text NOT NULL, source_type text NOT NULL,
 observed_at timestamptz NOT NULL CHECK(observed_at <= now()+interval '5 minutes'), received_at timestamptz NOT NULL DEFAULT now(),
 confidence numeric NOT NULL CHECK(confidence BETWEEN 0 AND 1), raw_status jsonb NOT NULL,
 ingestion_run_id uuid REFERENCES sync_logs(id), priority integer NOT NULL,
 freshness_seconds integer NOT NULL CHECK(freshness_seconds > 0),
 CHECK((status_kind='OPERATIONAL' AND status IN ('OPERATIONAL','NON_OPERATIONAL','TEMPORARILY_UNAVAILABLE','UNKNOWN','DECOMMISSIONED')) OR
       (status_kind='AVAILABILITY' AND status IN ('AVAILABLE','PARTIALLY_AVAILABLE','UNAVAILABLE','UNKNOWN'))),
 CHECK(status_kind <> 'AVAILABILITY' OR source_type IN ('CPO_REALTIME','OFFICIAL_LIVE','OCPI'))
);
CREATE INDEX observations_station_time_idx ON status_observations(station_id,observed_at DESC);
CREATE TABLE manual_status_overrides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), station_id uuid NOT NULL REFERENCES stations(id),
 previous_status text NOT NULL, new_status text NOT NULL CHECK(new_status IN ('ACTIVE','INACTIVE','TEMPORARILY_UNAVAILABLE','DECOMMISSIONED','UNKNOWN')),
 reason text NOT NULL CHECK(length(trim(reason)) > 0), changed_by text NOT NULL CHECK(length(trim(changed_by)) > 0),
 changed_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz CHECK(expires_at IS NULL OR expires_at > changed_at)
);
CREATE INDEX overrides_station_time_idx ON manual_status_overrides(station_id,changed_at DESC);
CREATE VIEW station_status AS
SELECT s.id station_id,
 COALESCE(CASE m.new_status WHEN 'ACTIVE' THEN 'OPERATIONAL' WHEN 'INACTIVE' THEN 'NON_OPERATIONAL' ELSE m.new_status END,o.status,'UNKNOWN') operational_status,
 CASE WHEN a.observed_at + make_interval(secs=>a.freshness_seconds) > now() THEN a.status WHEN a.id IS NOT NULL THEN 'STALE' ELSE 'UNKNOWN' END availability,
 CASE WHEN m.id IS NOT NULL THEN 'INTERNAL_ADMIN' ELSE o.source_provider END status_source,
 COALESCE(m.changed_at,o.observed_at) status_observed_at,
 CASE WHEN m.id IS NOT NULL THEN 'RECENT' WHEN o.id IS NULL THEN 'UNKNOWN'
      WHEN o.observed_at+make_interval(secs=>o.freshness_seconds) < now() THEN 'STALE' ELSE 'STATIC' END status_freshness,
 a.source_provider availability_source,a.observed_at availability_observed_at,
 CASE WHEN a.id IS NULL THEN 'UNKNOWN' WHEN a.observed_at+make_interval(secs=>a.freshness_seconds) <= now() THEN 'STALE' ELSE 'LIVE' END availability_freshness,
 m.id IS NOT NULL manual_override
FROM stations s
LEFT JOIN LATERAL (SELECT * FROM status_observations WHERE station_id=s.id AND status_kind='OPERATIONAL' AND status<>'UNKNOWN'
 ORDER BY (observed_at+make_interval(secs=>freshness_seconds)>now()) DESC,priority,observed_at DESC,received_at DESC LIMIT 1) o ON true
LEFT JOIN LATERAL (SELECT * FROM status_observations WHERE station_id=s.id AND status_kind='AVAILABILITY' AND connector_id IS NULL
 ORDER BY (observed_at+make_interval(secs=>freshness_seconds)>now()) DESC,priority,observed_at DESC,received_at DESC LIMIT 1) a ON true
LEFT JOIN LATERAL (SELECT * FROM manual_status_overrides WHERE station_id=s.id ORDER BY changed_at DESC LIMIT 1) m
 ON m.expires_at IS NULL OR m.expires_at>now();
