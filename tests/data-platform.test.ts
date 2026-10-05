import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { schema } from '@fastcharger/database';
import { ingestStations } from '../worker/src/ingestion/ingest-stations';
import { parseCsv,normalizeResearchRow,validIndiaCoordinates } from '../worker/src/providers/research';
import { OpenChargeMapProvider } from '../worker/src/providers/open-charge-map';
import { isDue,runScheduled } from '../worker/src/scheduler';
import { setManualStatus,refreshProviderStatus } from '../worker/src/status';
import { RedisCacheInvalidator } from '../worker/src/cache';
import { RawProviderArchivalService,MemoryObjectStorageClient } from '@fastcharger/storage';
import type { ProviderAdapter } from '../worker/src/providers/types';
config({path:['.env.local','.env'],quiet:true});

describe('Data activation guards',()=> {
  it('parses real export-style quoting, multiline fields and embedded JSON',()=> {
    expect(parseCsv('name,address,sources\r\n"synthetic, name","line1\nline2","[{""source"":""bee""}]"\r\n')[0]).toEqual({name:'synthetic, name',address:'line1\nline2',sources:'[{"source":"bee"}]'});
    expect(()=>parseCsv('a,b\n"bad,b')).toThrow();
  });
  it('rejects absent, infinite and out-of-India coordinates',()=> {
    expect(validIndiaCoordinates(NaN,77)).toBe(false);expect(validIndiaCoordinates(Infinity,77)).toBe(false);
    expect(validIndiaCoordinates(0,0)).toBe(false);expect(validIndiaCoordinates(28.61,77.2)).toBe(true);
  });
  it('requires provider identity and preserves provenance; does not generate live availability',()=> {
    const row={sources:'[{"source":"bee","source_station_id":"synthetic-id"}]',connectors_by_source:'[]',canonical_id:'synthetic-research-id',latitude:'28.6',longitude:'77.2',inventory_status:'listed'};
    const normalized=normalizeResearchRow(row);expect(normalized.status).toBe('unknown');expect(normalized.ocmId).toBeNull();expect(normalized.provenance![0].type).toBe('BEE');
    expect(()=>normalizeResearchRow({...row,sources:'[]'})).toThrow();
  });
  it('uses provider-specific due times',()=> {
    expect(isDue(new Date(0),604800,604799000)).toBe(false);expect(isDue(new Date(0),604800,604800000)).toBe(true);
    expect(isDue(new Date(0),300,300000)).toBe(true);
  });
  it('isolates Redis failure',async()=> {
    const invalidator=new RedisCacheInvalidator({del:async()=>{throw new Error('synthetic Redis outage');}});
    expect((await invalidator.invalidate({citySlugs:['synthetic-city']})).success).toBe(false);
  });
  it('does not turn invalid OCM responses into empty successful snapshots',async()=> {
    const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{"invalid":true}',{status:200}));
    try{await expect(new OpenChargeMapProvider({apiKey:'synthetic-test-key'}).fetchRawStations()).rejects.toThrow('non-array');}finally{fetch.mockRestore();}
  });
});

// All constructed stations are explicitly synthetic and live ONLY in a disposable database.
describe('PostgreSQL/PostGIS ingestion and status integration',()=> {
  const databaseName=`fastcharger_activation_test_${process.pid}`;
  let admin:Pool,pool:Pool,db:ReturnType<typeof drizzle<typeof schema>>;
  const archive=new RawProviderArchivalService(new MemoryObjectStorageClient());
  let data:unknown[]=[];let complete=true;
  const raw=(id:number,name='Synthetic station')=>({ID:id,AddressInfo:{Title:name,AddressLine1:`Synthetic address ${id}`,Latitude:28.6139,Longitude:77.209,Town:'Delhi',StateOrProvince:'Delhi'},OperatorInfo:{Title:'Synthetic operator'},StatusType:{Title:'Operational',IsOperational:true},Connections:[{ID:id*10,ConnectionType:{Title:'CCS Type 2'},PowerKW:30}]});
  const ocm=new OpenChargeMapProvider({apiKey:'synthetic-test-key'});
  const adapter:ProviderAdapter={providerName:'open-charge-map',fetchRawStations:async()=>({provider:'open-charge-map',data,receivedAt:new Date(),recordCount:data.length,metadata:{fullSnapshot:complete}}),normalizeRawStation:r=>ocm.normalizeRawStation(r),fetchStations:async()=>[],fetchStation:async()=>null,healthCheck:async()=>({provider:'open-charge-map',ok:true})};
  const run=()=>ingestStations({db,provider:adapter,useTransaction:true,fullSnapshot:true,archivalService:archive});
  beforeAll(async()=> {
    const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL required for disposable PostgreSQL integration tests');
    admin=new Pool({connectionString:url});await admin.query(`CREATE DATABASE "${databaseName}"`);
    const testUrl=new URL(url);testUrl.pathname='/'+databaseName;pool=new Pool({connectionString:testUrl.toString()});db=drizzle(pool,{schema});
    await migrate(db,{migrationsFolder:'database/migrations'});
    await db.execute(sql`INSERT INTO providers(provider_id,provider_name,provider_type,enabled,provider_status,supports_station_data,supports_status_data,supports_connector_data,supports_pricing,supports_live_availability,refresh_interval_seconds,status_interval_seconds,terms_notes)
      VALUES('open-charge-map','synthetic fixture','OPEN_CHARGE_MAP',true,'READY',true,true,true,false,false,604800,300,'synthetic scratch database only')`);
  },30000);
  afterAll(async()=>{await pool?.end();if(admin){await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);await admin.end();}});
  it('detects NEW, UNCHANGED, CHANGED and REMOVED_FROM_PROVIDER without deleting history',async()=> {
    data=[raw(1),raw(2)];let report=await run();expect(report.inserted).toBe(2);expect(report.duplicates).toBe(0);expect(report.statusChanges).toBe(2);
    report=await run();expect(report.inserted).toBe(0);expect(report.unchanged).toBe(2);expect(report.statusChanges).toBe(0);
    expect((await db.execute(sql`SELECT count(*)::int n FROM connectors`)).rows[0].n).toBe(2);
    data=[raw(1,'Synthetic changed station')];report=await run();expect(report.updated).toBe(1);expect(report.missing).toBe(1);
    expect((await db.execute(sql`SELECT count(*)::int n FROM stations`)).rows[0].n).toBe(2);
    expect((await db.execute(sql`SELECT count(*)::int n FROM stations WHERE lifecycle_state='MISSING_FROM_SOURCE'`)).rows[0].n).toBe(1);
  });
  it('withholds missing detection for partial snapshots and preserves seen invalid identities',async()=> {
    data=[raw(1),raw(2)];await run();data=[raw(1)];complete=false;expect((await run()).missing).toBe(0);
    complete=true;data=[raw(1),{ID:2,AddressInfo:{Latitude:null,Longitude:null}}];expect((await run()).rejected).toBe(1);
    expect((await db.execute(sql`SELECT count(*)::int n FROM station_provider_mappings WHERE missing_from_snapshot`)).rows[0].n).toBe(0);
  });
  it('keeps prior stations and reports a provider failure',async()=> {
    const failed={...adapter,fetchRawStations:async()=>{throw new Error('synthetic timeout');}};
    await expect(ingestStations({db,provider:failed,useTransaction:true,archivalService:archive})).rejects.toThrow();
    expect((await db.execute(sql`SELECT count(*)::int n FROM stations`)).rows[0].n).toBe(2);
    expect((await db.execute(sql`SELECT status FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`)).rows[0].status).toBe('failed');
  });
  it('retains raw evidence locally during object-storage outage',async()=> {
    const storage=new MemoryObjectStorageClient();
    vi.spyOn(storage,'putObject').mockRejectedValue(new Error('synthetic object-storage outage'));
    data=[raw(1),raw(2)];complete=true;
    const report=await ingestStations({db,provider:adapter,useTransaction:true,fullSnapshot:true,archivalService:new RawProviderArchivalService(storage)});
    expect(report.inserted).toBe(0);expect(report.archivedObjectKey).toBeTruthy();
    expect((await db.execute(sql`SELECT metadata->>'fallback' fallback FROM object_metadata WHERE object_key=${report.archivedObjectKey}`)).rows[0].fallback).toBe('true');
  });
  it('fails clearly when PostgreSQL is unavailable',async()=> {
    const unavailable=new Pool({host:'127.0.0.1',port:1,connectionTimeoutMillis:500});
    try {await expect(ingestStations({db:drizzle(unavailable,{schema}),provider:adapter,useTransaction:true,skipRawArchive:true})).rejects.toThrow();}
    finally{await unavailable.end();}
  });
  it('proves nearby queries and city aggregation use PostGIS/PostgreSQL',async()=> {
    expect((await db.execute(sql`SELECT count(*)::int n FROM stations WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint(77.209,28.6139),4326)::geography,1000)`)).rows[0].n).toBe(2);
    expect((await db.execute(sql`SELECT sum(station_count)::int n FROM cities`)).rows[0].n).toBe(2);
  });
  it('preserves provider status beneath an expiring manual correction',async()=> {
    const id=String((await db.execute(sql`SELECT id FROM stations LIMIT 1`)).rows[0].id);
    await setManualStatus(db,{stationId:id,newStatus:'TEMPORARILY_UNAVAILABLE',reason:'Synthetic override test',changedBy:'synthetic-admin',expiresAt:new Date(Date.now()+60000)});
    let status=(await db.execute(sql`SELECT * FROM station_status WHERE station_id=${id}`)).rows[0];expect(status.operational_status).toBe('TEMPORARILY_UNAVAILABLE');expect(status.availability).toBe('UNKNOWN');
    await db.execute(sql`UPDATE manual_status_overrides SET changed_at=now()-interval '2 minutes',expires_at=now()-interval '1 minute' WHERE station_id=${id}`);
    status=(await db.execute(sql`SELECT * FROM station_status WHERE station_id=${id}`)).rows[0];expect(status.operational_status).toBe('OPERATIONAL');expect(status.manual_override).toBe(false);
    expect((await db.execute(sql`SELECT count(*)::int n FROM status_observations WHERE station_id=${id}`)).rows[0].n).toBeGreaterThan(0);
  });
  it('refreshes authorized status, computes TTL and retains history on outage',async()=> {
    await db.execute(sql`UPDATE providers SET supports_live_availability=true WHERE provider_id='open-charge-map'`);
    const statusAdapter={...adapter,fetchStatuses:async()=>[{providerStationId:'1',availability:'AVAILABLE' as const,observedAt:new Date(),confidence:1,rawStatus:{synthetic:true}}]};
    expect((await refreshProviderStatus(db,statusAdapter)).updated).toBe(1);
    let status=(await db.execute(sql`SELECT ss.* FROM station_status ss JOIN station_provider_mappings m ON m.station_id=ss.station_id WHERE m.provider_station_id='1'`)).rows[0];expect(status.availability).toBe('AVAILABLE');expect(status.availability_freshness).toBe('LIVE');
    await db.execute(sql`UPDATE status_observations SET observed_at=now()-interval '1 hour' WHERE status_kind='AVAILABILITY'`);
    status=(await db.execute(sql`SELECT ss.* FROM station_status ss JOIN station_provider_mappings m ON m.station_id=ss.station_id WHERE m.provider_station_id='1'`)).rows[0];expect(status.availability).toBe('STALE');
    await expect(refreshProviderStatus(db,{...statusAdapter,fetchStatuses:async()=>{throw new Error('synthetic status outage');}})).rejects.toThrow();
    expect((await db.execute(sql`SELECT count(*)::int n FROM status_observations WHERE status_kind='AVAILABILITY'`)).rows[0].n).toBe(1);
    const reports=await runScheduled(db,{force:true,statusOnly:true,adapters:{'open-charge-map':statusAdapter}});expect(reports).toHaveLength(1);
  });
  it('rejects live status from static providers and future observations',async()=> {
    const id=String((await db.execute(sql`SELECT id FROM stations LIMIT 1`)).rows[0].id);
    await expect(db.execute(sql`INSERT INTO status_observations(station_id,status_kind,status,source_provider,source_type,observed_at,confidence,raw_status,priority,freshness_seconds)
      VALUES(${id},'AVAILABILITY','AVAILABLE','bee','BEE',now(),1,'{}',1,300)`)).rejects.toThrow();
    await expect(db.execute(sql`INSERT INTO status_observations(station_id,status_kind,status,source_provider,source_type,observed_at,confidence,raw_status,priority,freshness_seconds)
      VALUES(${id},'AVAILABILITY','AVAILABLE','open-charge-map','CPO_REALTIME',now()+interval '1 day',1,'{}',1,300)`)).rejects.toThrow();
  });
  it('prefers a fresh authorized observation over stale higher-priority evidence',async()=> {
    const id=String((await db.execute(sql`SELECT station_id FROM station_provider_mappings WHERE provider_station_id='1'`)).rows[0].station_id);
    await db.execute(sql`UPDATE status_observations SET observed_at=now()-interval '1 hour' WHERE status_kind='AVAILABILITY'`);
    await db.execute(sql`INSERT INTO status_observations(station_id,status_kind,status,source_provider,source_type,observed_at,confidence,raw_status,priority,freshness_seconds)
      VALUES(${id},'AVAILABILITY','UNAVAILABLE','open-charge-map','CPO_REALTIME',now(),1,'{"synthetic":true}',2,300)`);
    expect((await db.execute(sql`SELECT availability FROM station_status WHERE station_id=${id}`)).rows[0].availability).toBe('UNAVAILABLE');
  });
  it('runs the immediate scheduler through ingestion and report persistence',async()=> {
    data=[raw(1),raw(2)];complete=true;
    const reports=await runScheduled(db,{force:true,adapters:{'open-charge-map':adapter}});
    expect(reports).toHaveLength(1);expect((reports[0] as {status:string}).status).toBe('COMPLETED');
    expect((await db.execute(sql`SELECT last_successful_sync_at FROM providers WHERE provider_id='open-charge-map'`)).rows[0].last_successful_sync_at).not.toBeNull();
  });
  it('continues OCM ingestion when another scheduled provider fails',async()=> {
    await db.execute(sql`INSERT INTO providers(provider_id,provider_name,provider_type,enabled,provider_status,supports_station_data,supports_status_data,supports_connector_data,supports_pricing,supports_live_availability,refresh_interval_seconds,terms_notes)
      VALUES('bee','synthetic failure fixture','BEE',true,'READY',true,false,false,false,false,604800,'synthetic scratch fixture only')`);
    const failed={...adapter,providerName:'bee',fetchRawStations:async()=>{throw new Error('synthetic second-provider outage');}};
    const reports=await runScheduled(db,{force:true,adapters:{bee:failed,'open-charge-map':adapter}}) as Array<{provider:string;status:string}>;
    expect(reports.find(r=>r.provider==='bee')?.status).toBe('FAILED');
    expect(reports.find(r=>r.provider==='open-charge-map')?.status).toBe('COMPLETED');
    expect((await db.execute(sql`SELECT count(*)::int n FROM stations`)).rows[0].n).toBe(2);
  });
});
