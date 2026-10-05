"""Rebuild research inventory and measured comparisons from saved evidence.

Offline only. Statiq is excluded because its published terms prohibit automation.
Canonical identities are provisional; only corroborated cross-source pairs merge.
"""
import ast
import csv
import hashlib
import json
import math
import re
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EVIDENCE, DATA = ROOT/'evidence', ROOT/'datasets'
NS = uuid.UUID('b97fdd88-0214-4cc8-8b87-46dd4bf0c6ae')
BEE_URL = 'https://www.beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf'
URLS = {'bee': BEE_URL, 'delhi-ev': 'http://ev.delhi.gov.in/charging_station',
        'ocm': 'https://api.openchargemap.io/v3/poi/',
        'osm': 'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'tata-xprest': 'https://xprest.tatamotors.com/electric/chargingpoint',
        'dtl': 'https://dtl.gov.in/WriteReadData/Marquee/Total%20EV%20Charging%20Stations%20under%20DTL%20EV%20Tender%20-%2078%20sites.pdf'}


def read(name):
    return json.loads((EVIDENCE/name).read_text())


def clean(s):
    return re.sub(r'[^a-z0-9]+', ' ', str(s or '').lower()).strip()


def number(s):
    try:
        value = float(s)
        return value if math.isfinite(value) else None
    except (ValueError, TypeError):
        return None


def india_coords(lat, lon):
    return lat is not None and lon is not None and 6 <= lat <= 38 and 68 <= lon <= 98


def distance(a, b):
    la1, la2 = math.radians(a['latitude']), math.radians(b['latitude'])
    dl = math.radians(b['longitude']-a['longitude'])
    da = la2-la1
    h = math.sin(da/2)**2 + math.cos(la1)*math.cos(la2)*math.sin(dl/2)**2
    return 6371008.8 * 2 * math.asin(min(1, math.sqrt(h)))


OPERATOR_ALIASES = {'eesl': 'eesl', 'energy efficiency services limited': 'eesl',
                    'tata power in': 'tata power', 'tata power': 'tata power',
                    'efill': 'e fill', 'e fill electric in': 'e fill',
                    'revos': 'bolt earth', 'bolt earth': 'bolt earth',
                    'fortum charge drive india': 'glida', 'glida': 'glida',
                    'statiq in': 'statiq', 'statiq': 'statiq',
                    'iocl': 'iocl', 'indian oil': 'iocl'}


def operator_key(s):
    s = clean(s)
    return OPERATOR_ALIASES.get(s, s)


STATES=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
        'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
        'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
        'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
        'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry']
STATE_NAMES={clean(s):s for s in STATES}
STATE_NAMES.update({'uttrakhand':'Uttarakhand','uttaranchal':'Uttarakhand','andaman nicobar':'Andaman and Nicobar Islands',
                    'ut of d nh and d d':'Dadra and Nagar Haveli and Daman and Diu',
                    'jammu kashmir':'Jammu and Kashmir','new delhi':'Delhi','delhi nct':'Delhi','orissa':'Odisha',
                    'tamilnadu':'Tamil Nadu','mp':'Madhya Pradesh','mh':'Maharashtra','gj':'Gujarat','tn':'Tamil Nadu',
                    'rj':'Rajasthan','ka':'Karnataka','dadra and nagar haveli':'Dadra and Nagar Haveli and Daman and Diu'})


def normalized_state(s):
    return STATE_NAMES.get(clean(s),str(s).strip() if s else None)


def classify_pair(a, b):
    """Distance generates candidates. Identity requires independent attributes."""
    d = distance(a, b)
    op = bool(operator_key(a['operator'])) and operator_key(a['operator']) == operator_key(b['operator'])
    address = SequenceMatcher(None, clean(a['address']), clean(b['address'])).ratio() if a['address'] and b['address'] else 0
    name = SequenceMatcher(None, clean(a['name']), clean(b['name'])).ratio() if a['name'] and b['name'] else 0
    # Neither equal coordinates nor equal name alone can pass this rule.
    if d < 20 and op and address >= .9:
        verdict = 'MATCHED'
    elif d <= 50 and op and (address >= .65 or name >= .85):
        verdict = 'PROBABLE_MATCH'
    elif d <= 150 and (op or address >= .6 or name >= .8):
        verdict = 'POSSIBLE_MATCH'
    elif d <= 50:
        verdict = 'UNKNOWN'
    else:
        verdict = 'SEPARATE'
    return verdict, round(d, 2), round(address, 3), round(name, 3), op


def base(source, source_id, raw_ids, raw, **fields):
    lat, lon = number(fields.get('latitude')), number(fields.get('longitude'))
    valid = india_coords(lat, lon)
    raw_file = {'bee': 'bee-rows.json', 'delhi-ev': 'delhi-stations.json',
                'ocm': 'ocm-india.json', 'osm': 'osm-india.json',
                'tata-xprest': 'tata-xprest.html', 'dtl': 'dtl-rows.json'}[source]
    observed = datetime.fromtimestamp((EVIDENCE/raw_file).stat().st_mtime, timezone.utc).isoformat()
    result = dict(source=source, source_station_id=source_id,
                source_record_ids=raw_ids, source_url=URLS[source],
                raw_payload_hash=hashlib.sha256(json.dumps(raw, sort_keys=True, ensure_ascii=False).encode()).hexdigest(),
                provider=source, operator=None, name=None, address=None, city=None,
                district=None, state=None, pincode=None, country='IN',
                access_type='unknown', inventory_status='listed',
                operational_status='unknown', live_status='unknown',
                status_timestamp=None, realtime_supported=False,
                source_updated_at=None, dataset_date=None, last_verified=None,
                first_seen=observed, last_seen=observed,
                observed_at=observed, freshness_class='STATIC',
                connectors=[], opening_hours=None, pricing=None, payment_methods=None,
                quality_issues=[] if valid else ['invalid_or_missing_india_coordinates'],
                coordinate_valid=valid, canonical_id=None,
                confidence_score=None, confidence_reason='not calibrated against field verification')
    result.update({k: v for k, v in fields.items() if k not in ('latitude', 'longitude')})
    result.update(latitude=lat if valid else None, longitude=lon if valid else None)
    result['source_state']=result['state']
    result['state']=normalized_state(result['state'])
    if result['state'] and result['state'] not in STATES:
        result['quality_issues'].append('unresolved_state_metadata')
    result['operator_key']=operator_key(result['operator'])
    result['source_pincode']=result['pincode']
    if result['pincode'] and not re.fullmatch(r'[1-9]\d{5}',str(result['pincode']).strip()):
        result['quality_issues'].append('invalid_pincode')
        result['pincode']=None
    return result


def source_records():
    records = []
    bee = read('bee-rows.json')
    groups = defaultdict(list)
    for r in bee:
        # Same operator, exact address and coordinates: rows of one reported site.
        key = (clean(r['operator']), clean(r['address']), r['latitude'], r['longitude'])
        groups[key].append(r)
    for key, rows in groups.items():
        r = rows[0]
        sid = hashlib.sha256(json.dumps(key).encode()).hexdigest()[:24]
        obj = base('bee', sid, [x['source_record_id'] for x in rows], rows,
                   operator=r['operator'], address=r['address'], city=r['city'],
                   district=r['district'], state=r['state'], latitude=r['latitude'],
                   longitude=r['longitude'], access_type='public_reported', dataset_date='2025-10-26')
        unique_rows = {json.dumps({k: v for k, v in x.items() if k not in ('source_record_id', 'pdf_page', 'pdf_row')},sort_keys=True): x for x in rows}
        obj['connectors'] = [dict(type=x['connector_type'], power_kw=number(x['connector_rating_kw']),
                                  charger_rating_kw=number(x['charger_rating_kw']), quantity=number(x['connector_count']),
                                  source_connector_id=None, evse_id=None, live_status='unknown') for x in unique_rows.values()]
        obj['quality_issues'] += (['identical_rows_not_summed'] if len(unique_rows)<len(rows) else [])
        records.append(obj)
    for r in read('delhi-stations.json'):
        if r.get('charging_type') == 'Battery swapping':
            continue
        sid = f"{r['vendor']}:{r['id']}"
        obj = base('delhi-ev', sid, [r['id']], r, operator=r['vendor'],name=r.get('name') or None,
                   address=r['address'],city=r['city'],state='Delhi',pincode=r.get('postal_code'),
                   latitude=r['latitude'],longitude=r['longitude'],
                   opening_hours=r.get('timing'),pricing={'raw_cost_per_unit': r.get('cost_per_unit'), 'currency':'INR', 'unit':'unknown'},
                   payment_methods=r.get('payment_modes'))
        obj['connectors'] = [dict(type=r.get('charger_type'),raw_capacity=r.get('capacity'),
                                  quantity=r.get('no_of_chargers'),source_connector_id=None,
                                  live_status='unknown')]
        obj['quality_issues'].append('available_is_untimestamped_inventory_count')
        records.append(obj)
    for r in read('ocm-india.json'):
        a = r.get('AddressInfo') or {}
        u = r.get('UsageType') or {}
        access = 'private' if 'private' in str(u.get('Title','')).lower() else ('public_reported' if 'public' in str(u.get('Title','')).lower() else 'unknown')
        obj = base('ocm',str(r['ID']),[str(r['ID'])],r,name=a.get('Title'),operator=(r.get('OperatorInfo') or {}).get('Title'),
                   address=', '.join(str(a[k]) for k in ['AddressLine1','AddressLine2'] if a.get(k)),
                   city=a.get('Town'),state=a.get('StateOrProvince'),pincode=a.get('Postcode'),
                   latitude=a.get('Latitude'),longitude=a.get('Longitude'),access_type=access)
        obj.update(source_url=f"https://openchargemap.io/poi/details/{r['ID']}",
                   source_updated_at=r.get('DateLastStatusUpdate'), last_verified=r.get('DateLastVerified'),
                   inventory_status=(r.get('StatusType') or {}).get('Title') or 'unknown',
                   source_license=(r.get('DataProvider') or {}).get('License'),
                   attribution=(r.get('DataProvider') or {}).get('Title'))
        obj['connectors'] = [dict(type=(c.get('ConnectionType') or {}).get('Title'),power_kw=c.get('PowerKW'),
                                  quantity=c.get('Quantity'),source_connector_id=str(c.get('ID')),
                                  inventory_status=(c.get('StatusType') or {}).get('Title'),live_status='unknown')
                             for c in r.get('Connections') or []]
        records.append(obj)
    osm_file = EVIDENCE/'osm-india.json'
    if osm_file.exists():
        try:
            osm = read('osm-india.json')
        except json.JSONDecodeError:
            osm = {}
        for r in osm.get('elements',[]):
            t, c = r.get('tags',{}),r.get('center',r)
            obj = base('osm',f"{r['type']}/{r['id']}",[f"{r['type']}/{r['id']}"],r,
                       name=t.get('name'),operator=t.get('operator') or t.get('brand'),
                       address=' '.join(t[k] for k in ['addr:housenumber','addr:street'] if t.get(k)),
                       city=t.get('addr:city'),state=t.get('addr:state'),pincode=t.get('addr:postcode'),
                       latitude=c.get('lat'),longitude=c.get('lon'),opening_hours=t.get('opening_hours'),
                       access_type='private' if t.get('access') in ['private','no'] else ('public_reported' if t.get('access')=='yes' else 'unknown'))
            obj.update(source_updated_at=r.get('timestamp'),source_url=f"https://www.openstreetmap.org/{r['type']}/{r['id']}",source_license='ODbL-1.0')
            obj['connectors'] = [dict(type=k,quantity=number(v),live_status='unknown') for k,v in t.items() if k.startswith('socket:') and k.count(':')==1]
            records.append(obj)
    for r in read('dtl-rows.json'):
        obj=base('dtl',r['id'],[f"page-{r['pdf_page']}:serial-{r['id']}"],r,
                 name=r['name'],address=r['name'],operator=r['operator'],district=r['district'],
                 city='Delhi',state='Delhi',latitude=r['latitude'],longitude=r['longitude'],
                 access_type='public_reported',inventory_status='historically_reported_operational',
                 quality_issues=['historical_status_is_not_live','midpoint_table_extraction_review'])
        records.append(obj)
    return records


def write_csv(name, rows):
    if not rows:
        (DATA/name).write_text('')
        return
    fields = list(dict.fromkeys(k for row in rows for k in row))
    with (DATA/name).open('w',newline='') as f:
        w=csv.DictWriter(f,fields);w.writeheader()
        for row in rows:
            w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in row.items()})


def build():
    DATA.mkdir(exist_ok=True)
    records = source_records()
    # Collapse repeated source identities only when payload hashes agree; report conflicts.
    unique, identity_conflicts = {}, []
    for r in records:
        key=(r['source'],r['source_station_id'])
        if key in unique:
            identity_conflicts.append({'source':key[0],'source_station_id':key[1],
                                       'identical': unique[key]['raw_payload_hash']==r['raw_payload_hash']})
            if unique[key]['raw_payload_hash']!=r['raw_payload_hash']:
                r['source_station_id'] += ':'+r['raw_payload_hash'][:10]
                key=(r['source'],r['source_station_id'])
            else:
                continue
        unique[key]=r
    records=list(unique.values())
    # Latitude bands + longitude bands generate candidates; exact geodesic checks follow.
    grid=defaultdict(list); candidates=[]; matched_edges=[]
    for i,a in enumerate(records):
        if not a['coordinate_valid']:continue
        gy,gx=int(a['latitude']/.002),int(a['longitude']/.002)
        for y in range(gy-1,gy+2):
            for x in range(gx-2,gx+3):
                for j in grid[(y,x)]:
                    b=records[j]
                    if distance(a,b)>150:continue
                    verdict,d,addr,name,op=classify_pair(a,b)
                    candidates.append(dict(left_source=b['source'],left_id=b['source_station_id'],right_source=a['source'],
                                           right_id=a['source_station_id'],classification=verdict,distance_m=d,
                                           address_similarity=addr,name_similarity=name,operator_agrees=op))
                    if verdict=='MATCHED':matched_edges.append((j,i))
        grid[(gy,gx)].append(i)
    # Complete-link merge prevents A-B-C proximity chains from merging A and C.
    clusters={i:[i] for i in range(len(records))};owner=list(range(len(records)))
    for j,i in matched_edges:
        left,right=owner[j],owner[i]
        if left==right:continue
        if all(classify_pair(records[a],records[b])[0]=='MATCHED' for a in clusters[left] for b in clusters[right]):
            for member in clusters[right]:owner[member]=left
            clusters[left]+=clusters.pop(right)
    stations=[]
    priority={'bee':0,'delhi-ev':1,'dtl':2,'ocm':3,'osm':4}
    for members in clusters.values():
        sources=sorted((records[i] for i in members),key=lambda r:(priority.get(r['source'],9),r['source_station_id']))
        anchor=sources[0]
        cid=str(uuid.uuid5(NS,f"{anchor['source']}:{anchor['source_station_id']}"))
        for r in sources:r['canonical_id']=cid
        obj={k:v for k,v in anchor.items() if k not in ['raw_payload_hash','source_record_ids','source_station_id','provider']}
        obj.update(canonical_id=cid,identity_status='PROVISIONAL',
                   source_count=len(set(r['source'] for r in sources)),
                   sources=[{'source':r['source'],'source_station_id':r['source_station_id']} for r in sources],
                   connectors_by_source=[{'source':r['source'],'connectors':r['connectors']} for r in sources],
                   access_type=next((r['access_type'] for r in sources if r['access_type']!='unknown'),'unknown'))
        obj['display_name']=obj['name'] or obj['address']
        obj['display_name_origin']='station_name' if obj['name'] else 'address'
        # This snapshot ID is not a persisted cross-run canonical identifier.
        obj['quality_issues']=sorted(set(q for r in sources for q in r['quality_issues']))
        stations.append(obj)
    write_csv('india-master.csv',stations)
    # Explicit research box, not the statutory NCR boundary or Delhi NCT polygon.
    ncr=[r for r in stations if r['latitude'] is not None and 28.2<=r['latitude']<=29.1 and 76.8<=r['longitude']<=77.7]
    write_csv('delhi-ncr-master.csv',ncr)
    write_csv('station-sources.csv',records)
    write_csv('match-candidates.csv',candidates)
    write_csv('identity-conflicts.csv',identity_conflicts)
    write_csv('coordinate-quarantine.csv',[r for r in records if not r['coordinate_valid']])
    write_csv('address-discovery-queue.csv',read('tata-address-rows.json'))
    (DATA/'india-master.geojson').write_text(json.dumps({'type':'FeatureCollection','features':[
        {'type':'Feature','geometry':{'type':'Point','coordinates':[s['longitude'],s['latitude']]},
         'properties':{k:s[k] for k in ['canonical_id','name','operator','source_count','access_type','live_status','identity_status']}}
        for s in stations if s['coordinate_valid']]},ensure_ascii=False))
    now=datetime.now(timezone.utc)
    quality={}
    for source in sorted(set(r['source'] for r in records)):
        rs=[r for r in records if r['source']==source]
        n=len(rs)
        def fraction(field):return sum(bool(r.get(field)) for r in rs)/n
        coordinate=sum(r['coordinate_valid'] for r in rs)/n
        completeness=sum(fraction(k) for k in ['name','operator','address','city','state','pincode','opening_hours'])/7
        quality[source]=dict(reported_site_groups=n,coordinate_quality=coordinate,attribute_completeness=completeness,
                             missing_fields={k:sum(not bool(r.get(k)) for r in rs) for k in ['name','operator','address','city','state','pincode','opening_hours']},
                             measured_live_status_coverage=0,coverage=None,accuracy=None,api_reliability=None,
                             source_score=None,reason='coverage and field accuracy lack a validated denominator; API SLA unmeasured')
    ocm=read('ocm-india.json');old=0;no_timestamp=0
    for r in ocm:
        stamp=r.get('DateLastStatusUpdate')
        if not stamp:no_timestamp+=1;continue
        try:old+=(now-datetime.fromisoformat(stamp.replace('Z','+00:00')).replace(tzinfo=timezone.utc)).days>365
        except ValueError:no_timestamp+=1
    counts=Counter(r['source'] for r in records)
    source_sets=Counter('+'.join(sorted(set(records[i]['source'] for i in ms))) for ms in clusters.values())
    national_ocm_ids={str(r['ID']) for r in ocm}
    bbox=read('ocm-ncr-bbox.json')
    summary=dict(generated_at=now.isoformat(),scope='Collected public evidence only; not exhaustive or field-verified',
                 raw_bee_connector_rows=len(read('bee-rows.json')),raw_delhi_rows=len(read('delhi-stations.json')),
                 delhi_charging_rows=sum(r['charging_type']=='Charging' for r in read('delhi-stations.json')),
                 delhi_swapping_rows=sum(r['charging_type']=='Battery swapping' for r in read('delhi-stations.json')),
                 source_site_groups=dict(counts),provisional_canonical_stations=len(stations),
                 india_envelope_mappable_stations=sum(s['coordinate_valid'] for s in stations),
                 ncr_research_box_stations=len(ncr),source_membership=dict(source_sets),
                 source_only={s:source_sets.get(s,0) for s in counts},
                 cross_source_or_same_source_merges=len(records)-len(stations),
                 candidate_pair_classifications=dict(Counter(c['classification'] for c in candidates)),
                 coordinate_quarantine_records=sum(not r['coordinate_valid'] for r in records),
                 stations_with_verified_live_status=0,stations_without_verified_live_status=len(stations),
                 address_only_discovery_records=len(read('tata-address-rows.json')),
                 potentially_inactive_stations=None,
                 ocm_audit=dict(india_records=len(ocm),unique_ids=len(national_ocm_ids),
                                ncr_bbox_records=len(bbox),bbox_ids_absent_from_national=len({str(r['ID']) for r in bbox}-national_ocm_ids),
                                delhi_10km_records=len(read('ocm-delhi-10km.json')),delhi_25km_records=len(read('ocm-delhi-25km.json')),
                                private_records=sum('private' in str((r.get('UsageType') or {}).get('Title','')).lower() for r in ocm),
                                missing_country_metadata=sum(not (r.get('AddressInfo') or {}).get('Country') for r in ocm),
                                missing_state_metadata=sum(not (r.get('AddressInfo') or {}).get('StateOrProvince') for r in ocm),
                                missing_or_invalid_coords=sum(not india_coords(number((r.get('AddressInfo') or {}).get('Latitude')),number((r.get('AddressInfo') or {}).get('Longitude'))) for r in ocm),
                                inventory_not_operational=sum((r.get('StatusType') or {}).get('IsOperational') is False for r in ocm),
                                records_update_older_than_365_days=old,missing_update_timestamp=no_timestamp,
                                result_cap_reached=len(ocm)>=10000,removed_records='not measurable from a single snapshot'))
    (DATA/'summary.json').write_text(json.dumps(summary,indent=2))
    (DATA/'source-quality.json').write_text(json.dumps(quality,indent=2))
    print(json.dumps(summary,indent=2))


if __name__=='__main__':build()
