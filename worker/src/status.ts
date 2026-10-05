import { sql } from 'drizzle-orm';
import { getDb } from '@fastcharger/database';
import { getCacheInvalidator } from './cache';
import type { ProviderAdapter } from './providers/types';
export async function refreshProviderStatus(db:ReturnType<typeof getDb>,adapter:ProviderAdapter) {
  const capability=(await db.execute(sql`SELECT * FROM providers WHERE provider_id=${adapter.providerName} AND enabled AND supports_live_availability`)).rows[0];
  if(!capability||!adapter.fetchStatuses)throw new Error('Authorized live-status adapter is required');
  const log=(await db.execute(sql`INSERT INTO sync_logs(source,status) VALUES(${adapter.providerName+':status'},'running') RETURNING id`)).rows[0];
  try {
    const observations=await adapter.fetchStatuses();
    const updated=await db.transaction(async tx=> {
      let count=0;
      for(const observation of observations) {
        if(!Number.isFinite(observation.observedAt.getTime())||observation.observedAt.getTime()>Date.now()+300000)throw new Error('Untrustworthy status timestamp');
        const identity=(await tx.execute(sql`SELECT station_id FROM station_provider_mappings WHERE provider_name=${adapter.providerName} AND provider_station_id=${observation.providerStationId}`)).rows[0];
        if(!identity)throw new Error('Unknown provider station identity');
        let connectorId:string|null=null;
        if(observation.providerConnectorId) {
          const connector=(await tx.execute(sql`SELECT id FROM connectors WHERE station_id=${identity.station_id} AND provider_name=${adapter.providerName} AND provider_connector_id=${observation.providerConnectorId}`)).rows[0];
          if(!connector)throw new Error('Unknown provider connector identity');connectorId=String(connector.id);
        }
        await tx.execute(sql`INSERT INTO status_observations(station_id,connector_id,status_kind,status,source_provider,source_type,observed_at,confidence,raw_status,ingestion_run_id,priority,freshness_seconds)
          VALUES(${identity.station_id},${connectorId},'AVAILABILITY',${observation.availability},${adapter.providerName},'CPO_REALTIME',${observation.observedAt},${observation.confidence},${JSON.stringify(observation.rawStatus)}::jsonb,${log.id},1,${Number(capability.status_interval_seconds)||900})`);
        count++;
      }
      return count;
    });
    await db.execute(sql`UPDATE sync_logs SET status='completed',completed_at=now(),records_fetched=${observations.length},status_updates=${updated} WHERE id=${log.id}`);
    await db.execute(sql`UPDATE providers SET last_status_sync_at=now() WHERE provider_id=${adapter.providerName}`);
    await getCacheInvalidator().invalidate({tags:['station-status']});
    return {provider:adapter.providerName,updated,status:'COMPLETED'};
  } catch(error) {
    await db.execute(sql`UPDATE sync_logs SET status='failed',completed_at=now(),error_count=1,details='{"error":"Status refresh failed; previous observations retained"}'::jsonb WHERE id=${log.id}`);
    throw error;
  }
}
export async function setManualStatus(db:ReturnType<typeof getDb>,input:{stationId:string;newStatus:string;reason:string;changedBy:string;expiresAt:Date|null}) {
  if(!input.reason?.trim()||!input.changedBy?.trim()||!['ACTIVE','INACTIVE','TEMPORARILY_UNAVAILABLE','DECOMMISSIONED','UNKNOWN'].includes(input.newStatus))throw new Error('Invalid manual status correction');
  if(input.expiresAt && (!Number.isFinite(input.expiresAt.getTime())||input.expiresAt.getTime()<=Date.now()))throw new Error('Override expiry must be in the future');
  const result=await db.transaction(async tx=> {
    await tx.execute(sql`SELECT id FROM stations WHERE id=${input.stationId} FOR UPDATE`);
    const current=await tx.execute(sql`SELECT operational_status FROM station_status WHERE station_id=${input.stationId}`);
    if(!current.rows.length)throw new Error('Station not found');
    return (await tx.execute(sql`INSERT INTO manual_status_overrides(station_id,previous_status,new_status,reason,changed_by,expires_at)
      VALUES(${input.stationId},${current.rows[0].operational_status},${input.newStatus},${input.reason.trim()},${input.changedBy},${input.expiresAt}) RETURNING *`)).rows[0];
  });
  await getCacheInvalidator().invalidate({tags:['station-status'],stationSlugs:[input.stationId]});
  return result;
}
