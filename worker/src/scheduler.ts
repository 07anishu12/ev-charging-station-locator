import { sql } from 'drizzle-orm';
import { getDb } from '@fastcharger/database';
import { OpenChargeMapProvider } from './providers/open-charge-map';
import { BeeProvider } from './providers/bee';
import { ingestStations } from './ingestion/ingest-stations';
import { refreshProviderStatus } from './status';
import type { ProviderAdapter } from './providers/types';
export function isDue(last:Date|string|null,intervalSeconds:number,now=Date.now()) {
  return !last || now-new Date(last).getTime()>=intervalSeconds*1000;
}
export async function runScheduled(db:ReturnType<typeof getDb>,options:{force?:boolean;statusOnly?:boolean;adapters?:Record<string,ProviderAdapter>}={}) {
  const providers=(await db.execute(sql`SELECT * FROM providers WHERE enabled=true ORDER BY provider_id`)).rows;
  const reports:unknown[]=[];
  for(const p of providers) {
    if(options.statusOnly) {
      if(!p.supports_live_availability) {reports.push({provider:p.provider_id,status:'SKIPPED',reason:'No authorized live-status feed; availability remains unknown'});continue;}
      const adapter=options.adapters?.[String(p.provider_id)];
      if(!adapter?.fetchStatuses) {reports.push({provider:p.provider_id,status:'ACCESS_REQUIRED',reason:'No configured authorized status adapter'});continue;}
      if(!options.force&&!isDue(p.last_status_sync_at as Date|null,Number(p.status_interval_seconds)))continue;
      try {reports.push(await refreshProviderStatus(db,adapter));}catch{reports.push({provider:p.provider_id,status:'FAILED',reason:'Status refresh failed; previous observations retained'});}
      continue;
    }
    if(!options.force&&!isDue(p.last_successful_sync_at as Date|null,Number(p.refresh_interval_seconds)))continue;
    const provider=options.adapters?.[String(p.provider_id)]??(p.provider_id==='open-charge-map'?new OpenChargeMapProvider():p.provider_id==='bee'?new BeeProvider():null);
    if(!provider) {reports.push({provider:p.provider_id,status:'ACCESS_REQUIRED'});continue;}
    try {
      const result=await ingestStations({db,provider,useTransaction:true,fullSnapshot:true,maxResults:10000});
      reports.push({...result,status:'COMPLETED'});
      await db.execute(sql`UPDATE providers SET last_successful_sync_at=now() WHERE provider_id=${p.provider_id}`);
    } catch {reports.push({provider:p.provider_id,status:'FAILED',reason:'Provider run failed; canonical data retained; see ingestion_runs'});}
  }
  return reports;
}
