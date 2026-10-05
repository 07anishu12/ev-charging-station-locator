CREATE TABLE quarantined_station_records (
 station_id uuid PRIMARY KEY,
 quarantined_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL,
 station_record jsonb NOT NULL,
 connector_records jsonb NOT NULL,
 quality_records jsonb NOT NULL
);
