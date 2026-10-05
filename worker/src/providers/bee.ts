import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProviderStation } from '@fastcharger/shared';
import type { ProviderAdapter,RawProviderPayload } from './types';
import { normalizeConnectorType } from '../normalization/normalize-station';
import { retryWithBackoff } from './retry';
export const BEE_DATASET_URL='https://www.beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf';
interface BeeSite {id:string;row:Record<string,string>;rows:Record<string,string>[]}
export class BeeProvider implements ProviderAdapter {
  readonly providerName='bee';
  async fetchRawStations():Promise<RawProviderPayload> {
    const directory=path.resolve('.ingestion/bee');await mkdir(directory,{recursive:true});
    const pdf=path.join(directory,'bee-pcs.pdf');
    const response=await retryWithBackoff(async()=> {
      const r=await fetch(BEE_DATASET_URL,{signal:AbortSignal.timeout(60000)});
      if(!r.ok)throw Object.assign(new Error(`BEE dataset HTTP ${r.status}`),{status:r.status});
      return r;
    },{maxRetries:2,initialDelayMs:1000,maxDelayMs:4000});
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.subarray(0,4).toString()!=='%PDF')throw new Error('BEE returned a non-PDF response');
    // Archive original before parsing; malformed PDFs never mutate canonical stations.
    const archive=path.join(directory,`${Date.now()}.pdf`);await writeFile(archive,bytes,{mode:0o600});await writeFile(pdf,bytes,{mode:0o600});
    await promisify(execFile)('python3',['worker/src/providers/bee-sites.py',pdf,path.join(directory,'sites.json')],{maxBuffer:1024*1024,timeout:300000});
    const output=JSON.parse(await readFile(path.join(directory,'sites.json'),'utf8'));
    if(!Array.isArray(output.sites)||!output.sites.length)throw new Error('BEE dataset extracted no station sites');
    return {provider:'bee',data:output.sites,recordCount:output.sites.length,receivedAt:new Date(),
      metadata:{fullSnapshot:output.errors===0,httpStatus:response.status,sourceUrl:BEE_DATASET_URL,rawPdfArchive:archive,rawPdfChecksumSha256:createHash('sha256').update(bytes).digest('hex'),rawPdfSizeBytes:bytes.length,extractionErrors:output.errors}};
  }
  normalizeRawStation(raw:unknown):ProviderStation|null {
    const site=raw as BeeSite; if(!site?.id||!site.row||!Array.isArray(site.rows))return null;
    const r=site.row;
    return {externalId:site.id,ocmId:null,name:r.address||null,address:r.address||null,
      latitude:r.latitude?Number(r.latitude):NaN,longitude:r.longitude?Number(r.longitude):NaN,
      operatorName:r.operator||null,operatorWebsite:null,city:r.city||null,state:r.state||null,district:r.district||null,pincode:null,
      status:'unknown',usageType:'public_reported',dataProvider:'bee',dataLicense:null,ocmUrl:null,lastVerifiedAt:null,
      sourceUrl:BEE_DATASET_URL,sourceType:'BEE',
      provenance:[{provider:'bee',id:site.id,type:'BEE',url:BEE_DATASET_URL,evidence:{sourceRecordIds:site.rows.map(x=>x.source_record_id),identity:'derived operator/address/coordinate site hash; not an official BEE station ID'}}],
      connectors:site.rows.map((c,i)=>({providerConnectorId:`${site.id}:${i}`,sourceProvider:'bee',ocmConnectionId:null,
        type:c.connector_type||'unknown',normalizedType:normalizeConnectorType(c.connector_type),level:null,
        powerKw:c.connector_rating_kw&&Number.isFinite(Number(c.connector_rating_kw))?Number(c.connector_rating_kw):null,
        voltage:null,amps:null,quantity:Math.max(1,Math.floor(Number(c.connector_count)||1)),status:'unknown'}))};
  }
  async fetchStations(){const raw=await this.fetchRawStations();return (raw.data as unknown[]).map(r=>this.normalizeRawStation(r)).filter((r):r is ProviderStation=>!!r);}
  async fetchStation(){return null;}
  async healthCheck(){return {provider:'bee',ok:true,message:'Official PDF adapter; no authorized live API configured'};}
}
