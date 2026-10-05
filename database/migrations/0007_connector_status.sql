CREATE VIEW connector_status AS
SELECT c.id connector_id,c.station_id,
 CASE WHEN o.observed_at+make_interval(secs=>o.freshness_seconds)>now() THEN o.status WHEN o.id IS NOT NULL THEN 'STALE' ELSE 'UNKNOWN' END availability,
 o.source_provider status_source,o.observed_at status_observed_at,
 CASE WHEN o.id IS NULL THEN 'UNKNOWN' WHEN o.observed_at+make_interval(secs=>o.freshness_seconds)<=now() THEN 'STALE' ELSE 'LIVE' END status_freshness
FROM connectors c LEFT JOIN LATERAL (
 SELECT * FROM status_observations WHERE connector_id=c.id AND status_kind='AVAILABILITY'
 ORDER BY (observed_at+make_interval(secs=>freshness_seconds)>now()) DESC,priority,observed_at DESC,received_at DESC LIMIT 1
) o ON true;

CREATE FUNCTION enforce_live_provider() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status_kind='AVAILABILITY' AND NOT EXISTS(SELECT 1 FROM providers WHERE provider_id=NEW.source_provider AND enabled AND supports_live_availability) THEN
   RAISE EXCEPTION 'Provider has no authorized live-availability capability';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER status_provider_capability BEFORE INSERT ON status_observations FOR EACH ROW EXECUTE FUNCTION enforce_live_provider();
