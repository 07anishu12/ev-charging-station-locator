// Read-only coverage audit. OCM key stays in headers and is never persisted.
// Uses existing dotenv; ordinary GETs are sequential and limited to one per second.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const local=fs.existsSync('.env.local')?dotenv.parse(fs.readFileSync('.env.local')):{};
const key=process.env.OCM_API_KEY||process.env.OPENCHARGEMAP_API_KEY||local.OCM_API_KEY||local.OPENCHARGEMAP_API_KEY;
if(!key)throw new Error('OCM API key required in environment or existing .env.local');
const cells=[];
for(let south=6;south<38;south+=8)for(let west=68;west<100;west+=8)cells.push([south,west,south+8,west+8]);
const ids=new Map();const manifest=[];
async function query(bounds,depth=0){
  const [south,west,north,east]=bounds;
  const u=new URL('https://api.openchargemap.io/v3/poi/');
  Object.entries({output:'json',countrycode:'IN',maxresults:10000,compact:false,verbose:false,
                  boundingbox:`(${south},${west}),(${north},${east})`}).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw new Error(`OCM grid HTTP ${r.status}; stop; honor Retry-After before resuming`);
  const data=await r.json();
  if(!Array.isArray(data))throw new Error('OCM grid semantic failure: non-array response');
  const entry={bounds,request_url:u.toString(),http_status:r.status,record_count:data.length,
               observed_at:new Date().toISOString(),saturated:data.length>=10000};
  manifest.push(entry);
  fs.writeFileSync(path.join(root,'evidence',`ocm-cell-${bounds.join('_')}.json`),JSON.stringify(data));
  for(const station of data)ids.set(String(station.ID),station);
  console.log(JSON.stringify({bounds,records:data.length,saturated:entry.saturated}));
  await new Promise(resolve=>setTimeout(resolve,1000));
  if(entry.saturated){
    if(depth>=8)throw new Error('Unresolved saturated geographic cell; coverage incomplete');
    const midlat=(south+north)/2,midlon=(west+east)/2;
    for(const box of [[south,west,midlat,midlon],[south,midlon,midlat,east],[midlat,west,north,midlon],[midlat,midlon,north,east]])await query(box,depth+1);
  }
}
for(const cell of cells)await query(cell);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'evidence/ocm-india.json')));
const baselineIds=new Set(baseline.map(r=>String(r.ID)));
const result={queries:manifest,unique_ids:ids.size,baseline_ids:baselineIds.size,
              grid_only_ids:[...ids.keys()].filter(id=>!baselineIds.has(id)),
              baseline_only_ids:[...baselineIds].filter(id=>!ids.has(id)),
              scope:'India country filter across geographic grid; rectangular envelope includes islands'};
fs.writeFileSync(path.join(root,'evidence/ocm-grid-manifest.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(root,'evidence/ocm-grid-india.json'),JSON.stringify([...ids.values()]));
console.log(JSON.stringify({unique_ids:ids.size,grid_only_ids:result.grid_only_ids.length,baseline_only_ids:result.baseline_only_ids.length}));
