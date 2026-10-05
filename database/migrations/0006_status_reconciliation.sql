CREATE OR REPLACE VIEW station_status AS
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

CREATE VIEW source_errors AS SELECT id AS ingestion_run_id,source AS provider,started_at,completed_at,error_count,details FROM sync_logs WHERE status='failed';
