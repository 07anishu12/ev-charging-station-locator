import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { getDb } from '@fastcharger/database';
import { createSlug, resolveCanonicalCity, resolveCanonicalState, type ProviderStation } from '@fastcharger/shared';
import { getProviderDefinition, WEEK } from '../providers/registry';
import { validIndiaCoordinates } from '../providers/research';
type Db=ReturnType<typeof getDb>;
export const hashPayload=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function stationFingerprint(s:ProviderStation) {
  return hashPayload([s.name,s.address,s.latitude,s.longitude,s.city,s.state,s.district,s.pincode,s.operatorName,s.status,s.usageType,s.connectors]);
}
export function operationalStatus(status:string) {
  const normalized=status.trim().toLowerCase().replace(/_/g,' ');
  if(normalized==='operational'||normalized==='active')return 'OPERATIONAL';
  if(['not operational','non operational','inactive'].includes(normalized))return 'NON_OPERATIONAL';
  if(normalized==='temporarily unavailable')return 'TEMPORARILY_UNAVAILABLE';
  if(normalized==='decommissioned')return 'DECOMMISSIONED';
  return 'UNKNOWN';
}
export function provenanceFor(s:ProviderStation,provider:string) {
  return s.provenance??[{provider,id:s.externalId,type:s.sourceType??getProviderDefinition(provider).providerType,
    url:s.sourceUrl??s.ocmUrl,updatedAt:s.sourceUpdatedAt,lastSeenAt:s.sourceLastSeenAt}];
}
export async function resolveGeography(db:Db,s:ProviderStation) {
  const state=resolveCanonicalState(s.state??'');
  let stateId:string|null=null;let cityId:string|null=null;
  if(state) {
    const result=await db.execute(sql`INSERT INTO states(name,slug,code) VALUES(${state.name},${state.slug},${state.code})
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name RETURNING id`);
    stateId=String(result.rows[0].id);
  }
  const canonical=resolveCanonicalCity(s.city,s.address,s.state,{allowFallback:false});
  if(canonical && (!state || canonical.stateSlug===state.slug)) {
    const result=await db.execute(sql`SELECT id FROM cities WHERE slug=${canonical.canonicalSlug}`);
    if(result.rows[0])cityId=String(result.rows[0].id);
  }
  // Spatial fallback uses PostGIS and the closest compatible city, never list order.
  if(!cityId && stateId && validIndiaCoordinates(s.latitude,s.longitude)) {
    const result=await db.execute(sql`SELECT id FROM cities WHERE state_id=${stateId} AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND ST_DWithin(ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography,ST_SetSRID(ST_MakePoint(${s.longitude},${s.latitude}),4326)::geography,25000)
      ORDER BY ST_Distance(ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography,ST_SetSRID(ST_MakePoint(${s.longitude},${s.latitude}),4326)::geography) LIMIT 1`);
    if(result.rows[0])cityId=String(result.rows[0].id);
  }
  if(!cityId && s.city?.trim() && stateId) {
    const name=s.city.trim();const slug=`${createSlug(name)}-${state?.slug}`;
    const result=await db.execute(sql`INSERT INTO cities(name,slug,state_id) VALUES(${name},${slug},${stateId})
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name RETURNING id`);
    cityId=String(result.rows[0].id);
  }
  if(stateId&&s.district?.trim()) {
    await db.execute(sql`INSERT INTO districts(name,slug,state_id) VALUES(${s.district.trim()},${createSlug(s.district)+'-'+state?.slug},${stateId}) ON CONFLICT(slug) DO NOTHING`);
  }
  if(s.pincode&&/^[1-9]\d{5}$/.test(s.pincode)) {
    await db.execute(sql`INSERT INTO pincodes(pincode,city_id,state_id,district) VALUES(${s.pincode},${cityId},${stateId},${s.district}) ON CONFLICT(pincode) DO NOTHING`);
  }
  return {stateId,cityId};
}
export async function findSpatialIdentity(db:Db,s:ProviderStation,operatorId:string|null) {
  const result=await db.execute(sql`SELECT id,slug,name,address,operator_id FROM stations
    WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint(${s.longitude},${s.latitude}),4326)::geography,50) LIMIT 30`);
  const normalize=(x:unknown)=>String(x??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const matches=result.rows.filter(c=>normalize(c.name)===normalize(s.name) && !!normalize(s.name) &&
    normalize(c.address)===normalize(s.address) && !!normalize(s.address) && operatorId && c.operator_id===operatorId);
  return {match:matches.length===1?matches[0]:null,candidates:result.rows};
}
export async function recordOperationalObservation(db:Db,s:ProviderStation,stationId:string,provider:string,runId:string,receivedAt:Date) {
  const source=provenanceFor(s,provider)[0];
  const observed=s.sourceObservedAt??s.lastVerifiedAt??receivedAt;
  await db.execute(sql`INSERT INTO status_observations(station_id,status_kind,status,source_provider,source_type,
    observed_at,received_at,confidence,raw_status,ingestion_run_id,priority,freshness_seconds)
    VALUES(${stationId},'OPERATIONAL',${operationalStatus(s.status)},${source.provider},${source.type},${observed},${receivedAt},0,
      ${JSON.stringify({providerOperationalStatus:s.status,sourceTimestamp:s.sourceUpdatedAt,confidence:'uncalibrated'})}::jsonb,${runId},6,${WEEK})`);
}
