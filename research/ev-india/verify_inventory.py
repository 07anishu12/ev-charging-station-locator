"""Small offline regression check; all constructed stations below are synthetic."""
import csv
import json
from pathlib import Path
from build_inventory import classify_pair, india_coords, number

ROOT=Path(__file__).resolve().parent


def verify():
    # Synthetic identity cases: coordinates or name alone must never cause merging.
    a=dict(latitude=28.6,longitude=77.2,operator='synthetic operator',
           name='synthetic station',address='synthetic address')
    b=dict(a)
    assert classify_pair(a,b)[0]=='MATCHED'
    b['operator']='different synthetic operator'
    assert classify_pair(a,b)[0]!='MATCHED'
    b=dict(a,address='different synthetic address')
    assert classify_pair(a,b)[0]!='MATCHED'
    b=dict(a,latitude=28.8)
    assert classify_pair(a,b)[0]=='SEPARATE'
    assert not india_coords(number('nan'),77)
    assert not india_coords(0,0)
    assert not india_coords(27.6,27.6)
    summary=json.loads((ROOT/'datasets/summary.json').read_text())
    rows=list(csv.DictReader((ROOT/'datasets/india-master.csv').open()))
    assert len(rows)==summary['provisional_canonical_stations']
    assert len(set(r['canonical_id'] for r in rows))==len(rows)
    assert all(r['live_status']=='unknown' and not r['status_timestamp'] for r in rows)
    assert all('statiq' not in [s['source'] for s in json.loads(r['sources'])] for r in rows)
    for r in rows:
        assert bool(r['latitude'])==bool(r['longitude'])
        if r['latitude']: assert india_coords(float(r['latitude']),float(r['longitude']))
    sources=list(csv.DictReader((ROOT/'datasets/station-sources.csv').open()))
    assert len(set((r['source'],r['source_station_id']) for r in sources))==len(sources)
    canonical_ids={x['canonical_id'] for x in rows}
    assert all(r['canonical_id'] in canonical_ids for r in sources)
    ncr=list(csv.DictReader((ROOT/'datasets/delhi-ncr-master.csv').open()))
    assert len(ncr)==summary['ncr_research_box_stations']
    assert all(28.2<=float(r['latitude'])<=29.1 and 76.8<=float(r['longitude'])<=77.7 for r in ncr)
    bee=json.loads((ROOT/'evidence/bee-rows.json').read_text())
    assert len(bee)==39641
    assert len(set(r['source_record_id'] for r in bee))==len(bee)
    assert {r['pdf_page'] for r in bee}==set(range(1,1160))
    assert all(r['operator'] and r['state'] and r['address'] for r in bee)
    # Grounded sample manually compared to rendered PDF page 1.
    assert bee[0]['latitude']=='12.034186' and bee[0]['longitude']=='92.992718'
    assert bee[0]['operator']=='IOCL' and bee[0]['connector_type']=='Type-II AC'
    assert bee[2]['address'].endswith('South Anda')
    collection=json.loads((ROOT/'postman_collection.json').read_text())
    assert collection['info']['schema']=='https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    catalog=json.loads((ROOT/'source-inventory.json').read_text())
    assert len({r['id'] for r in catalog})==len(catalog)
    assert all(r['endpoint_class'] in ['VERIFIED','DOCUMENTED','OBSERVED','INFERRED','UNVERIFIED'] for r in catalog)
    print(f'PASS: {len(rows)} provisional stations, {len(sources)} source sites, all PDF pages, identity guards, unknown live status, restricted-source exclusion, request JSON.')


if __name__=='__main__':verify()
