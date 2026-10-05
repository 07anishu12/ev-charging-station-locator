import { config } from 'dotenv';
config({path:['.env.local','.env'],quiet:true});
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { sql } from 'drizzle-orm';
import { getDb,closeDb } from '@fastcharger/database';
import { FastChargerApiClient } from '@fastcharger/shared';
import { parseCsv,validIndiaCoordinates,normalizeResearchRow } from '../providers/research';

async function main() {
  const db=getDb(); const client=new FastChargerApiClient({baseUrl:process.env.API_URL||'http://localhost:4000',validateResponses:true});
  const rows=parseCsv(await readFile(process.env.RESEARCH_STATIONS_FILE||'research/ev-india/datasets/india-master.csv','utf8'));
  const ncr=rows.filter(r=>Number(r.latitude)>=28.2&&Number(r.latitude)<=29.1&&Number(r.longitude)>=76.8&&Number(r.longitude)<=77.7);
  const query=async(q:Parameters<typeof db.execute>[0])=>(await db.execute(q)).rows;
  const totals=(await query(sql`SELECT (SELECT count(*)::int FROM stations) stations,(SELECT count(*)::int FROM connectors) connectors,(SELECT count(*)::int FROM operators) operators,(SELECT count(*)::int FROM states) states,(SELECT count(*)::int FROM districts) districts,(SELECT count(*)::int FROM cities) cities,(SELECT count(*)::int FROM pincodes) pincodes,(SELECT count(distinct city_id)::int FROM stations) covered_cities`))[0];
  const status=(await query(sql`SELECT count(*) FILTER(WHERE operational_status<>'UNKNOWN')::int operational,count(*) FILTER(WHERE availability IN ('AVAILABLE','PARTIALLY_AVAILABLE','UNAVAILABLE'))::int live_availability,count(*) FILTER(WHERE status_freshness='STALE' OR availability_freshness='STALE')::int stale,count(*) FILTER(WHERE availability='UNKNOWN')::int unknown_availability,count(*) FILTER(WHERE manual_override)::int manual_overrides FROM station_status`))[0];
  const integrity=(await query(sql`SELECT count(*) FILTER(WHERE location IS NULL)::int missing_coordinates,count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM station_provider_mappings m WHERE m.station_id=s.id))::int missing_provenance FROM stations s`))[0];
  const cityChecks=[];
  for(const slug of ['delhi','mumbai','bengaluru','hyderabad','chennai','gurugram','noida','pune']) {
    const actual=Number((await query(sql`SELECT count(*)::int n FROM stations s JOIN cities c ON s.city_id=c.id WHERE c.slug=${slug}`))[0].n);
    const detail=await client.getCity(slug,{pageSize:20});const statistics=await client.getCityStatistics(slug);
    cityChecks.push({slug,database:actual,api:detail?.pagination.total,statistics:statistics?.stationCount,pass:actual===detail?.pagination.total&&actual===statistics?.stationCount});
  }
  const nearby=[];
  for(const radiusKm of [1,5,10,25]) {
    const actual=Number((await query(sql`SELECT count(*)::int n FROM stations WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint(77.209,28.6139),4326)::geography,${radiusKm*1000})`))[0].n);
    const result=await client.getNearbyStations({latitude:28.6139,longitude:77.209,radiusKm,pageSize:20});
    nearby.push({radiusKm,database:actual,api:result.pagination.total,pass:actual===result.pagination.total});
  }
  const list=await client.getStations({pageSize:20});const cities=await client.getCities({pageSize:20});const statistics=await client.getStatistics();
  const canonicalNcr=(await query(sql`SELECT count(*)::int stations FROM stations WHERE latitude BETWEEN 28.2 AND 29.1 AND longitude BETWEEN 76.8 AND 77.7`))[0];
  const identities=ncr.flatMap(r=>normalizeResearchRow(r).provenance??[]);
  const identityValues=sql.join(identities.map(i=>sql`(${i.provider},${i.id})`),sql`, `);
  const mappedNcr=(await query(sql`SELECT count(distinct m.station_id)::int stations FROM station_provider_mappings m JOIN (VALUES ${identityValues}) input(provider,id) ON m.provider_name=input.provider AND m.provider_station_id=input.id`))[0];
  const validRows=rows.filter(r=>r.latitude&&r.longitude&&validIndiaCoordinates(Number(r.latitude),Number(r.longitude)));
  const allIdentities=validRows.flatMap(r=>(normalizeResearchRow(r).provenance??[]).map(i=>({research_id:r.canonical_id,provider:i.provider,provider_id:i.id})));
  const researchIdentityAudit=(await query(sql`WITH input AS (SELECT * FROM jsonb_to_recordset(${JSON.stringify(allIdentities)}::jsonb) AS t(research_id text,provider text,provider_id text)),linked AS (SELECT input.research_id,m.station_id FROM input LEFT JOIN station_provider_mappings m ON m.provider_name=input.provider AND m.provider_station_id=input.provider_id)
    SELECT count(distinct research_id)::int input_valid,count(distinct research_id) FILTER(WHERE station_id IS NOT NULL)::int mapped_input_records,count(distinct station_id)::int research_canonical_stations,(SELECT count(*)::int FROM (SELECT research_id FROM linked GROUP BY research_id HAVING count(distinct station_id)>1) a) conflicting_identity_groups FROM linked`))[0];
  const report={verifiedAt:new Date().toISOString(),postgres:(await query(sql`SELECT version(),PostGIS_Version() postgis`))[0],research:{records:rows.length,valid:rows.filter(r=>r.latitude&&r.longitude&&validIndiaCoordinates(Number(r.latitude),Number(r.longitude))).length},totals,status,integrity,delhiNcr:{definition:'Research bounding box 28.2–29.1 N, 76.8–77.7 E; not the statutory NCR boundary',raw:ncr.length,valid:ncr.filter(r=>validIndiaCoordinates(Number(r.latitude),Number(r.longitude))).length,canonical:canonicalNcr.stations,researchMappedCanonical:mappedNcr.stations},cityChecks,nearby,api:{stations:{pass:list.pagination.total===totals.stations,total:list.pagination.total},cities:{pass:cities.items.length>0,total:cities.pagination.total},statistics:{pass:statistics.totalStations===totals.stations&&statistics.totalCities===totals.covered_cities,...statistics}},providers:await query(sql`SELECT provider_id,provider_status,enabled,supports_live_availability,last_successful_sync_at,last_status_sync_at FROM providers ORDER BY provider_id`),recentRuns:await query(sql`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 12`)};
  const completeReport={...report,researchIdentityAudit};
  await mkdir('.ingestion/reports',{recursive:true});await writeFile('.ingestion/reports/database-verification.json',JSON.stringify(completeReport,null,2),{mode:0o600});console.log(JSON.stringify(completeReport,null,2));
  if(cityChecks.some(c=>!c.pass)||nearby.some(c=>!c.pass)||!report.api.stations.pass||!report.api.statistics.pass||integrity.missing_coordinates||integrity.missing_provenance)process.exitCode=1;
}
main().catch(()=>{console.error('Database/API verification failed; credentials suppressed.');process.exitCode=1;}).finally(closeDb);
