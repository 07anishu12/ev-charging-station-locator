import { config } from 'dotenv';
config({path:['.env.local','.env'],quiet:true});
import { mkdir,writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { sql } from 'drizzle-orm';
import { getDb,closeDb } from '@fastcharger/database';
import { ingestStations } from '../ingestion/ingest-stations';
import { ResearchProvider,parseCsv } from '../providers/research';
import { OpenChargeMapProvider } from '../providers/open-charge-map';
import { BeeProvider } from '../providers/bee';
import { PROVIDERS } from '../providers/registry';
import { runScheduled } from '../scheduler';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFile } from 'node:fs/promises';
import { setManualStatus } from '../status';

async function main() {
  const command=process.argv[2];const db=getDb();
  if(command==='migrate') {await migrate(db,{migrationsFolder:'database/migrations'});return;}
  if(command==='profile') {
    const rows=parseCsv(await readFile('research/ev-india/datasets/india-master.csv','utf8'));
    const duplicates=(field:string)=>rows.length-new Set(rows.map(r=>r[field]).filter(Boolean)).size-rows.filter(r=>!r[field]).length;
    console.log(JSON.stringify({total:rows.length,withCoordinates:rows.filter(r=>r.latitude&&r.longitude).length,
      withoutCoordinates:rows.filter(r=>!r.latitude||!r.longitude).length,
      duplicateCoordinatePairs:rows.filter(r=>r.latitude&&r.longitude).length-new Set(rows.filter(r=>r.latitude&&r.longitude).map(r=>`${r.latitude},${r.longitude}`)).size,
      duplicateNames:duplicates('name'),withProviderIds:rows.filter(r=>JSON.parse(r.sources||'[]').every((s:{source_station_id:string})=>s.source_station_id)).length,
      withOperators:rows.filter(r=>r.operator).length,withConnectors:rows.filter(r=>JSON.parse(r.connectors||'[]').length).length,
      withStatus:rows.filter(r=>r.inventory_status).length,withProvenance:rows.filter(r=>r.source_url&&r.sources).length},null,2));return;
  }
  for(const p of PROVIDERS)await db.execute(sql`INSERT INTO providers(provider_id,provider_name,provider_type,enabled,provider_status,
    supports_station_data,supports_status_data,supports_connector_data,supports_pricing,supports_live_availability,refresh_interval_seconds,status_interval_seconds,terms_notes)
    VALUES(${p.providerId},${p.providerName},${p.providerType},${p.enabled},${p.providerStatus},${p.supportsStationData},${p.supportsStatusData},${p.supportsConnectorData},${p.supportsPricing},${p.supportsLiveAvailability},${p.refreshIntervalSeconds},${p.statusIntervalSeconds},${p.termsNotes}) ON CONFLICT(provider_id) DO NOTHING`);
  let report:unknown;
  if(command==='import') report=await ingestStations({provider:new ResearchProvider(process.env.RESEARCH_STATIONS_FILE),maxResults:Number.MAX_SAFE_INTEGER,useTransaction:true});
  else if(command==='ocm')report=await ingestStations({provider:new OpenChargeMapProvider(),maxResults:10000,useTransaction:true,fullSnapshot:true});
  else if(command==='bee')report=await ingestStations({provider:new BeeProvider(),useTransaction:true,fullSnapshot:true});
  else if(command==='sync'||command==='status')report=await runScheduled(db,{force:process.argv.includes('--now'),statusOnly:command==='status'});
  else if(command==='admin') {
    const [action,...args]=process.argv.slice(3);
    if(action==='search') report=(await db.execute(sql`SELECT id,name,address,data_provider FROM stations WHERE name ILIKE ${'%'+args.join(' ')+'%'} LIMIT 30`)).rows;
    else if(action==='history') {
      report={observations:(await db.execute(sql`SELECT * FROM status_observations WHERE station_id=${args[0]} ORDER BY observed_at DESC LIMIT 100`)).rows,
        overrides:(await db.execute(sql`SELECT * FROM manual_status_overrides WHERE station_id=${args[0]} ORDER BY changed_at DESC`)).rows,
        evidence:(await db.execute(sql`SELECT provider_name,provider_station_id,source_url,last_seen_at,raw_data FROM station_provider_mappings WHERE station_id=${args[0]}`)).rows};
    } else if(action==='set') report=await setManualStatus(db,{stationId:args[0],newStatus:args[1],reason:args[2],changedBy:userInfo().username,expiresAt:args[3]?new Date(args[3]):null});
    else throw new Error('admin search <query> | history <station UUID> | set <UUID> <status> <reason> [ISO expiry]');
  } else throw new Error('Unknown data-platform command');
  await mkdir('.ingestion/reports',{recursive:true});await writeFile(`.ingestion/reports/${command}-${Date.now()}.json`,JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify(report,null,2));
  if(Array.isArray(report)&&report.some(r=>r.status==='FAILED'))process.exitCode=1;
}
main().catch(()=> {console.error('Data command failed. Inspect ingestion_runs and source_errors/data_quality_issues; no credentials printed.');process.exitCode=1;}).finally(closeDb);
