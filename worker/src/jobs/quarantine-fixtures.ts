import { config } from 'dotenv';
config({path:['.env.local','.env'],quiet:true});
import { sql } from 'drizzle-orm';
import { getDb,closeDb } from '@fastcharger/database';
// Used only to identify and quarantine historical synthetic seed records, never to ingest.
import { MOCK_STATIONS } from '../../../lib/mock/data';
async function main() {
  const db=getDb();
  const count=await db.transaction(async tx=> {
    let moved=0;
    for(const fixture of MOCK_STATIONS) {
      const rows=(await tx.execute(sql`SELECT s.* FROM stations s WHERE external_id=${fixture.id} AND name=${fixture.name}
        AND research_canonical_id IS NULL AND NOT EXISTS(SELECT 1 FROM station_provider_mappings WHERE station_id=s.id)
        AND NOT EXISTS(SELECT 1 FROM status_observations WHERE station_id=s.id)
        AND NOT EXISTS(SELECT 1 FROM manual_status_overrides WHERE station_id=s.id) FOR UPDATE`)).rows;
      for(const station of rows) {
        await tx.execute(sql`INSERT INTO quarantined_station_records(station_id,reason,station_record,connector_records,quality_records)
          SELECT s.id,'Exact match to synthetic repository fixture with no acquired provenance or status history',to_jsonb(s),
            COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM connectors c WHERE c.station_id=s.id),'[]'),
            COALESCE((SELECT jsonb_agg(to_jsonb(q)) FROM data_quality_issues q WHERE q.station_id=s.id),'[]')
          FROM stations s WHERE id=${station.id}`);
        await tx.execute(sql`DELETE FROM stations WHERE id=${station.id}`);moved++;
      }
    }
    await tx.execute(sql`UPDATE cities c SET station_count=(SELECT count(*) FROM stations WHERE city_id=c.id)`);
    return moved;
  });
  console.log(JSON.stringify({quarantinedSyntheticFixtures:count,realStationRecordsDeleted:0,archive:'quarantined_station_records'}));
}
main().catch(()=>{console.error('Fixture quarantine failed; transaction rolled back.');process.exitCode=1;}).finally(closeDb);
