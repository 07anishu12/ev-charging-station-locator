-- Synthetic fixtures only. Execute in an isolated scratch database after schema.sql.
BEGIN;
SET search_path TO ev_inventory,public;
DO $$
DECLARE st uuid; con uuid; outcome text;
BEGIN
  INSERT INTO sources VALUES ('synthetic-static','synthetic','VERIFIED','allowed',NULL,1,1,'STATIC',NULL,false);
  INSERT INTO sources VALUES ('synthetic-live','synthetic','VERIFIED','allowed',NULL,1,1,'REALTIME',300,true);
  INSERT INTO sources VALUES ('synthetic-live-backup','synthetic','VERIFIED','allowed',NULL,1,2,'REALTIME',300,true);
  INSERT INTO stations (name) VALUES ('synthetic fixture') RETURNING id INTO st;
  INSERT INTO connectors (station_id,source,source_connector_id) VALUES (st,'synthetic-live','synthetic-c1') RETURNING id INTO con;
  SELECT live_status INTO outcome FROM current_connector_status WHERE connector_id=con;
  ASSERT outcome='unknown','No inventory status may imply availability';
  BEGIN
    INSERT INTO connector_status(station_id,connector_id,source,status,source_status_timestamp,raw_status)
    VALUES (st,con,'synthetic-static','available',now(),'{}');
    RAISE EXCEPTION 'Static status wrongly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='Static status wrongly accepted' THEN RAISE; END IF;
  END;
  INSERT INTO connector_status(station_id,connector_id,source,status,source_status_timestamp,raw_status)
  VALUES (st,con,'synthetic-live','available',now()-interval '1 minute','{}');
  SELECT live_status INTO outcome FROM current_connector_status WHERE connector_id=con;
  ASSERT outcome='available','Fresh authorized status must be visible';
  UPDATE connector_status SET source_status_timestamp=now()-interval '10 minutes' WHERE connector_id=con;
  SELECT live_status INTO outcome FROM current_connector_status WHERE connector_id=con;
  ASSERT outcome='unknown','Expired status must become unknown';
  INSERT INTO connector_status(station_id,connector_id,source,status,source_status_timestamp,raw_status)
  VALUES (st,con,'synthetic-live-backup','faulted',now()-interval '1 minute','{}');
  SELECT live_status INTO outcome FROM current_connector_status WHERE connector_id=con;
  ASSERT outcome='faulted','Expired primary must not shadow fresh backup';
  BEGIN
    INSERT INTO station_status(station_id,source,status,source_status_timestamp,raw_status)
    VALUES (st,'synthetic-live','available',now()+interval '1 hour','{}');
    RAISE EXCEPTION 'Future timestamp wrongly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='Future timestamp wrongly accepted' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: unknown default, static-source rejection, fresh status, TTL expiry, backup selection, future timestamp rejection';
END $$;
ROLLBACK;
