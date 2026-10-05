import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProviderStation, ProviderStationQuery } from '@fastcharger/shared';
import { normalizeConnectorType, normalizeStationStatus } from '../normalization/normalize-station';
import { getProviderDefinition } from './registry';
import type { ProviderAdapter, RawProviderPayload } from './types';

// RFC 4180: embedded JSON, quotes, CRLF and multiline addresses occur in the real export.
export function parseCsv(text: string): Record<string,string>[] {
  const rows: string[][]=[]; let row: string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(c==='"') { if(quoted && text[i+1]==='"') {cell+='"';i++;} else quoted=!quoted; }
    else if(c===',' && !quoted) {row.push(cell);cell='';}
    else if(c==='\n' && !quoted) {row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted) throw new Error('Unterminated quoted CSV field');
  if(cell || row.length) {row.push(cell.replace(/\r$/,''));rows.push(row);}
  const header=rows.shift(); if(!header?.length) throw new Error('Missing CSV header');
  return rows.filter(r=>r.some(Boolean)).map(r=> {
    if(r.length!==header.length) throw new Error('CSV column count does not match header');
    return Object.fromEntries(header.map((k,i)=>[k.replace(/^\uFEFF/,''),r[i]]));
  });
}
export function validIndiaCoordinates(lat:number,lng:number) {
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=6&&lat<=38&&lng>=68&&lng<=98;
}
function date(value?:string): Date|null {const d=value?new Date(value):null;return d && Number.isFinite(d.getTime()) && d.getTime()<=Date.now()+300000?d:null;}
export function normalizeResearchRow(r:Record<string,string>): ProviderStation {
  const sources=JSON.parse(r.sources) as Array<{source:string;source_station_id:string}>;
  if(!sources.length || sources.some(s=>!s.source_station_id)) throw new Error('Missing provider identity');
  const provenance=sources.map(s=>({provider:s.source==='ocm'?'open-charge-map':s.source,id:s.source_station_id,
    type:getProviderDefinition(s.source==='ocm'?'open-charge-map':s.source).providerType,
    url:r.source_url||null,updatedAt:date(r.source_updated_at),lastSeenAt:date(r.last_seen),
    evidence:{ researchCanonicalId:r.canonical_id,datasetDate:r.dataset_date,identity:r.identity_status,license:r.source_license,attribution:r.attribution }}));
  const ocm=provenance.find(s=>s.provider==='open-charge-map');
  const groups=JSON.parse(r.connectors_by_source||'[]') as Array<{source:string;connectors:Array<Record<string,unknown>>}>;
  return {
    externalId:r.canonical_id,researchCanonicalId:r.canonical_id,ocmId:ocm?Number(ocm.id):null,
    name:r.name||r.display_name||r.address||null,latitude:r.latitude?Number(r.latitude):NaN,longitude:r.longitude?Number(r.longitude):NaN,
    address:r.address||null,city:r.city||null,state:r.state||null,district:r.district||null,pincode:r.pincode||null,
    operatorName:r.operator||null,operatorWebsite:null,status:normalizeStationStatus(r.inventory_status),
    usageType:r.access_type||null,dataProvider:provenance[0].provider,dataLicense:r.source_license||null,ocmUrl:ocm?r.source_url:null,
    sourceUrl:r.source_url,sourceType:provenance[0].type,sourceUpdatedAt:date(r.source_updated_at),sourceObservedAt:date(r.last_verified||r.source_updated_at||r.dataset_date||r.observed_at),
    sourceLastSeenAt:date(r.last_seen),lastVerifiedAt:date(r.last_verified),provenance,
    connectors:groups.flatMap(g=>g.connectors.map((c,i)=>({
      sourceProvider:g.source==='ocm'?'open-charge-map':g.source,
      providerConnectorId:String(c.source_connector_id??`${sources.find(s=>s.source===g.source)?.source_station_id}:${i}`),
      ocmConnectionId:g.source==='ocm'&&c.source_connector_id?Number(c.source_connector_id):null,
      type:String(c.type||'unknown'),normalizedType:normalizeConnectorType(String(c.type||'')),level:null,
      powerKw:c.power_kw!==null&&c.power_kw!==undefined&&Number.isFinite(Number(c.power_kw))&&Number(c.power_kw)>=0?Number(c.power_kw):null,
      voltage:null,amps:null,status:'unknown',quantity:Math.max(1,Math.floor(Number(c.quantity)||1)),
    }))),
  };
}
export class ResearchProvider implements ProviderAdapter {
  readonly providerName='research-import';
  private sourceRows=new Map<string,Record<string,string>>();
  constructor(private readonly file=path.resolve('research/ev-india/datasets/india-master.csv')) {}
  async fetchRawStations(query?:ProviderStationQuery):Promise<RawProviderPayload> {
    const data=parseCsv(await readFile(this.file,'utf8'));
    try {
      const sites=parseCsv(await readFile(path.join(path.dirname(this.file),'station-sources.csv'),'utf8'));
      this.sourceRows=new Map(sites.map(s=>[`${s.source}:${s.source_station_id}`,s]));
    } catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    return {provider:this.providerName,data:query?.maxResults?data.slice(0,query.maxResults):data,receivedAt:new Date(),recordCount:data.length,
      metadata:{fullSnapshot:false,file:path.basename(this.file)}};
  }
  normalizeRawStation(raw:unknown) {
    try {
      const station=normalizeResearchRow(raw as Record<string,string>);
      station.provenance=station.provenance!.map(m=> {
        const r=this.sourceRows.get(`${m.provider==='open-charge-map'?'ocm':m.provider}:${m.id}`);
        return r?{...m,url:r.source_url,updatedAt:date(r.source_updated_at),lastSeenAt:date(r.last_seen),evidence:{...m.evidence as object,sourceRecordIds:JSON.parse(r.source_record_ids||'[]'),payloadHash:r.raw_payload_hash,license:r.source_license,attribution:r.attribution}}:m;
      });
      return station;
    }catch{return null;}
  }
  async fetchStations() {const raw=await this.fetchRawStations();return (raw.data as unknown[]).map(x=>this.normalizeRawStation(x)).filter((x):x is ProviderStation=>!!x);}
  async fetchStation(){return null;}
  async healthCheck(){try{await readFile(this.file);return {provider:this.providerName,ok:true};}catch{return {provider:this.providerName,ok:false};}}
}
