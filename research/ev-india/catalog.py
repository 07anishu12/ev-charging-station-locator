"""Generate source inventory, API directory and request artifacts from observed research."""
import csv
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
BEE='https://www.beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf'
SOURCES=[]


def add(id,name,organization,url,coverage='India; Delhi/NCR coverage must be measured',**kw):
    row=dict(id=id,name=name,organization=organization,organization_country='IN',coverage=coverage,
             covers_india=True,covers_delhi_ncr=None,data_type='station discovery',
             api_availability='not established',endpoint=None,endpoint_class='UNVERIFIED',
             http_method=None,parameters=None,authentication='unknown',api_key_required=None,
             rate_limits='unknown',pagination='unknown',geographic_filtering='unknown',
             station_filtering='unknown',realtime='UNKNOWN',realtime_evidence='not tested',
             update_frequency='unknown',data_format='HTML/app',json_schema=None,
             static_or_dynamic='unknown',provenance_type='first-party',terms_url=None,
             license='not established',automation_permission='unknown',reliability='not measured',
             station_count=None,last_observed_update=None,observed_on='2026-10-04 UTC / 2026-10-05 IST',
             example_request=None,example_response=None,curl=None,postman_request=None,
             recommended_ingestion='Obtain a documented feed and permitted reuse before scheduling.',
             source_url=url)
    row.update(kw);SOURCES.append(row)


def build():
    summary=json.loads((ROOT/'datasets/summary.json').read_text())
    add('ocm','Open Charge Map','Open Charge Map','https://openchargemap.io/develop','India/global',
        organization_country=None,covers_delhi_ncr=True,api_availability='REST',endpoint='https://api.openchargemap.io/v3/poi/',
        endpoint_class='VERIFIED',http_method='GET',authentication='X-API-Key header; existing workspace credential used without disclosure',
        api_key_required=True,parameters={'countrycode':'IN','maxresults':10000,'compact':False,'verbose':True,
                                       'latitude':'optional','longitude':'optional','distance':'optional','distanceunit':'KM',
                                       'boundingbox':'(south,west),(north,east)','chargepointid':'optional'},
        geographic_filtering='country, tested radius, tested boundingbox',station_filtering='chargepointid tested',
        pagination='No verified offset pagination. Recursively subdivide saturated geographic cells.',
        realtime='STATIC',realtime_evidence='OCM inventory status and modification dates are not a heartbeat.',
        data_format='JSON array',static_or_dynamic='dynamic inventory',provenance_type='aggregated/community',
        terms_url='https://openchargemap.io/develop',license='CC BY 4.0 for community data; imported records retain provider licenses',
        automation_permission='allowed subject to API and per-record license terms',station_count=summary['ocm_audit']['india_records'],
        recommended_ingestion='Daily bounded incremental pulls plus adaptive geographic reconciliation; preserve attribution.')
    add('ocm-reference','OCM reference data','Open Charge Map','https://openchargemap.io/develop',
        organization_country=None,api_availability='REST',endpoint='https://api.openchargemap.io/v3/referencedata/',
        endpoint_class='VERIFIED',http_method='GET',api_key_required=True,authentication='X-API-Key',
        data_type='operators, countries, connection types, usage types, status types',data_format='JSON',realtime='STATIC',
        recommended_ingestion='Cache reference dictionaries; retain raw IDs and titles.')
    add('delhi-ev','Delhi EV map','Delhi Transport Department','https://ev.delhi.gov.in/charging_station','Delhi NCT advertised; coordinates validate individually',
        covers_delhi_ncr=True,data_type='charging and swapping inventory',api_availability='No station API observed; SSR embedded Python literal',
        endpoint='http://ev.delhi.gov.in/charging_station',endpoint_class='VERIFIED',http_method='GET',
        authentication='none',api_key_required=False,pagination='All 891 embedded rows in one response; no pagination observed',
        geographic_filtering='Client-side region/pincode maps',station_filtering='Client-side markers',
        realtime='STATIC',realtime_evidence='No status timestamps; available mirrors no_of_chargers. Display totals hardcoded.',
        data_format='HTML with let all_locations = Python literal',static_or_dynamic='undated inventory snapshot',
        station_count=summary['delhi_charging_rows'],license='EV portal license not established; general GNCTD policy is not automatically an EV feed license',
        last_observed_update=None,reliability='HTTP page returned 200; HTTPS certificate expired 2025-08-27',
        recommended_ingestion='Research extraction verified. Production needs repaired HTTPS and portal-specific reuse terms; ast.literal_eval only, never eval.')
    add('delhi-openev','Delhi OpenEV database link','Delhi Transport Department','https://ev.delhi.gov.in/openev/','Delhi',
        covers_delhi_ncr=True,endpoint='http://ev.delhi.gov.in/openev/',endpoint_class='OBSERVED',http_method='GET',
        reliability='HTTP request redirected to /openev then returned 404',
        recommended_ingestion='No list/detail/status/DocType verified. Ask authority for current open feed; do not guess Frappe resources.')
    add('bee','BEE public charging dataset','Bureau of Energy Efficiency / Ministry of Power',BEE,'India, all states/UTs represented in collected rows',
        covers_delhi_ncr=True,data_type='charger/connector rows with station addresses and coordinates',
        api_availability='downloadable PDF, not live API',endpoint=BEE,endpoint_class='VERIFIED',http_method='GET',
        authentication='none',api_key_required=False,pagination='1159 PDF pages; all extracted',geographic_filtering='Offline state/district/coordinates',
        realtime='STATIC',data_format='Excel-export PDF',static_or_dynamic='static',update_frequency='publication-dependent, not established',
        station_count=summary['source_site_groups']['bee'],last_observed_update='Dataset labeled through 2025-10-26; PDF metadata creation 2026-02-17',
        license='Public download; explicit dataset redistribution license not established',
        reliability='200 application/pdf; 39641 rows extracted; invalid XRef warnings recovered by Poppler',
        recommended_ingestion='Daily check official index for changed download; hash PDF; preserve dataset date, PDF page/row, repeated connector rows, coordinate quarantine.')
    add('evyatra','EV Yatra','Bureau of Energy Efficiency','https://evyatra.beeindia.gov.in/','India',
        covers_delhi_ncr=True,provenance_type='CPO submissions aggregated by government',
        realtime='UNKNOWN',realtime_evidence='Official app advertises real-time, but no timestamped feed obtained',
        reliability='Direct HTTPS and HTTP requests timed out',recommended_ingestion='Use BEE published inventory now; seek authorized EV Yatra export/availability feed.')
    add('dtl','Delhi Transco 78-site list','Delhi Transco Limited',
        'https://dtl.gov.in/WriteReadData/Marquee/Total%20EV%20Charging%20Stations%20under%20DTL%20EV%20Tender%20-%2078%20sites.pdf','Delhi',
        covers_delhi_ncr=True,data_type='reported operational project sites, charger counts, swapping counts',
        endpoint='https://dtl.gov.in/WriteReadData/Marquee/Total%20EV%20Charging%20Stations%20under%20DTL%20EV%20Tender%20-%2078%20sites.pdf',
        endpoint_class='VERIFIED',http_method='GET',authentication='none',api_key_required=False,realtime='STATIC',
        station_count=78,data_format='PDF, 2 pages',last_observed_update='Header references inauguration 2024-12-04; publication date not established',
        recommended_ingestion='Static project evidence; extract address/coordinates and validate historical status. Some include swapping; never add tender totals blindly.')
    add('mop-installed','MoP installed-site list','Ministry of Power',
        'https://powermin.gov.in/sites/default/files/uploads/Details_of_Public_Charging_Stations_Installed.pdf','India including NCR',
        covers_delhi_ncr=True,endpoint='https://powermin.gov.in/sites/default/files/uploads/Details_of_Public_Charging_Stations_Installed.pdf',
        endpoint_class='DOCUMENTED',http_method='GET',realtime='STATIC',data_format='PDF',
        recommended_ingestion='Historical site leads; preserve authority and unknown dataset date; compare to BEE before adding.')
    add('mhi-sanctions','FAME allocation tables','Ministry of Heavy Industries',
        'https://heavyindustries.gov.in/sites/default/files/2023-09/2-e_didm_writereaddata_userfiles_press_release_for_charging_infrastructiure.pdf','India',
        covers_delhi_ncr=True,data_type='sanctioned allocations, not verified station existence',realtime='STATIC',data_format='PDF',
        recommended_ingestion='Store project/planned evidence only; promote after commissioning proof.')
    add('eamrit','e-AMRIT map and locator directory','NITI Aayog','https://e-amrit.niti.gov.in/charging-map','India',
        covers_delhi_ncr=None,provenance_type='aggregated',realtime='UNKNOWN',
        recommended_ingestion='Trace map source and dates; do not treat headline counts as a current census.')
    add('data-gov','Open Government Data EVPCS catalog','OGD Platform India / state catalogs','https://tn.data.gov.in/keywords/EVPCS','India/state catalog',
        provenance_type='aggregated',data_type='dataset discovery',recommended_ingestion='Locate resource-specific downloads/API IDs and license; do not invent api.data.gov.in resource UUIDs.')
    local=[
        ('hareda','Haryana HAREDA','Haryana New & Renewable Energy Department','https://hareda.gov.in/about-department/electric-vehicle/','Haryana; advisory directs CPO weekly reporting'),
        ('msedcl','MSEDCL EVCS connections','Maharashtra State Electricity Distribution Co.','https://evincentive.mahadiscom.in/EVCS/evcs?uiActionName=getEvcsConnList','Maharashtra; electricity connections may include captive sites'),
        ('bescom','BESCOM EV land aggregator / EV Mithra','BESCOM','https://evkarnataka.bescom.org/','Karnataka; land offers are not operational stations'),
        ('kseb','KSEB PM E-DRIVE','Kerala State Electricity Board','https://pmedrivekerala.kseb.in/','Kerala; operational/proposed project evidence'),
        ('anert','ANERT EV tender','ANERT Kerala','https://www.anert.gov.in/sites/default/files/inline-files/EVCS_1.pdf','Kerala; tender evidence'),
        ('tgredco','TGREDCO charging infrastructure','Telangana Renewable Energy Development Corporation','https://tgredco.telangana.gov.in/ChargingInfrastructure.aspx','Telangana; distinguish proposed/sanctioned from available'),
        ('nredcap','NREDCAP','New & Renewable Energy Development Corporation AP','https://www.nredcap.in/Default.aspx','Andhra Pradesh'),
        ('wbsedcl','WBSEDCL EV','West Bengal State Electricity Distribution Co.','https://wbsedcl.in/irj/go/km/docs/internet/new_website/EV.html','West Bengal'),
        ('odisha','Odisha EV tenders','Odisha Transport','https://odishatransport.gov.in/tender/14/68','Odisha; tender inventory is planned evidence'),
        ('surat','EVolute Surat','Surat Municipal Corporation','https://www.smc.gov.in/EServices/EVoluteSurat','Surat, Gujarat; app discovery'),
        ('ladakh','Ladakh charging inauguration','Administration of Ladakh','https://ladakh.gov.in/in-a-first-l-g-vk-saxena-inaugurates-five-ev-charging-stations-across-ladakh/','Ladakh; date-specific commissioning evidence'),
        ('goa-gis','One Map Goa','Government of Goa','https://onemapgoagis.goa.gov.in/','Goa; no EV-specific layer verified'),
        ('rajasthan-gis','Rajdharaa','Government of Rajasthan','https://gisportal.rajasthan.gov.in/citizen/Help/Citizen_help/index.html','Rajasthan; no EV layer verified'),
    ]
    for id,n,o,u,c in local:add(id,n,o,u,c,data_type='regional inventory/project/discovery leads',realtime='UNKNOWN')
    operators=[
        ('statiq','Statiq','Sharify Services','https://www.statiq.in/ev-charging-station'),
        ('tata-power','Tata Power EZ Charge','Tata Power','https://www.tatapower.com/ezcharge/knowledge-hub'),
        ('chargezone','ChargeZone','ChargeZone','https://chargezone.co.in/app-download'),
        ('jiobp','Jio-bp pulse','Reliance BP Mobility','https://www.jiobp.com/products-and-services/EV-charging'),
        ('zeon','Zeon Charging','Zeon Electric','https://www.zeoncharging.com/'),
        ('glida','GLIDA','GLIDA / former Fortum Charge & Drive India','https://www.glida.in/locations/'),
        ('kazam','Kazam','Kazam Energy','https://www.kazam.in/'),
        ('bolt','Bolt.Earth','Bolt.Earth / Revos','https://bolt.earth/discovery-api'),
        ('chargemod','chargeMOD','chargeMOD','https://www.chargemod.com/'),
        ('efill','E-Fill','Efill Electric','https://iot.efillelectric.com/'),
        ('sunfuel','SunFuel','SunFuel Electric','https://www.sunfuelelectric.com/'),
        ('eesl','EESL/CESL','Energy Efficiency Services Limited','https://eeslindia.org/img/news_m/EESL_May_Newsletter.pdf'),
        ('reil','REIL','Rajasthan Electronics and Instruments','https://www.reiljp.com/pressrelease/prel170.aspx'),
        ('ntpc','NTPC','NTPC','https://tgredco.telangana.gov.in/GOISanctionedEVCS.aspx'),
        ('fortum','Fortum India legacy','Fortum / GLIDA','https://www.glida.in/glida-near-you/'),
        ('bpcl','BPCL eDrive','Bharat Petroleum','https://www.bharatpetroleum.in/our-businesses/fuels-and-services/edrive'),
        ('hpcl','HPCL','Hindustan Petroleum','https://www.hindustanpetroleum.com/hp-retail'),
        ('iocl','IOCL','Indian Oil Corporation','https://locator.iocl.com/'),
        ('adani','Adani TotalEnergies E-Mobility','Adani TotalEnergies','https://connect.adani.com/annual_report/2025/atgl/pdf/Strategic%20Review.pdf'),
        ('hyundai','Hyundai charging ecosystem','Hyundai Motor India','https://www.hyundai.com/in/en/hyundai-story/media-center/press-release/hmi-jio-bp-join-hands-integrate-ev-charging-network'),
        ('mg','eHUB by MG','JSW MG Motor India','https://www.mgmotor.co.in/media-center/newsroom/e-hub-by-mg-becomes-indias-largest-unified-ev-charging-app'),
        ('mahindra','CHARGE_iN','Mahindra','https://www.mahindraelectricsuv.com/technology/Charge_IN.html'),
        ('gentari','Gentari Go','Gentari','https://www.gentari.in/go/charging-network'),
        ('shell','Shell Recharge India','Shell India','https://www.shell.in/shell-recharge.html'),
        ('ather','Ather Grid','Ather Energy','https://www.atherenergy.com/faq/charging-grid/grid-payments'),
        ('evre','EVRE','EVRE','https://www.evre.in/netra-one'),
        ('relux','Relux Electric','Relux Electric','https://reluxelectric.com/location'),
        ('volttic','Volttic','Volttic','https://volttic.com/category/projects/'),
    ]
    for id,n,o,u in operators:
        extra={}
        if id=='statiq':extra=dict(automation_permission='prohibited without express written permission',terms_url='https://www.statiq.in/termsandconditions-page',
                                  recommended_ingestion='STOP. Excluded from master datasets; obtain licensed feed / written permission.',
                                  realtime_evidence='One connector detail reported faulted, without source status timestamp',provenance_type='first-party and roaming/aggregated')
        if id=='bolt':extra=dict(api_availability='Official Discovery API product; endpoint and credentials not public in reviewed page',
                                realtime_evidence='Official product advertises availability/pricing/functionality; not verified by timestamped response',automation_permission='contract_required')
        if id=='glida':extra=dict(api_availability='Observed REST-like PHP JSON',endpoint='https://www.glida.in/glidachargersapi.php',endpoint_class='OBSERVED',http_method='GET',
                                 authentication='no authentication presented in page request',data_format='JSON',reliability='Two 200 responses contained Internal server error; zero station records obtained')
        if id in ['mg','hyundai','gentari']:extra['provenance_type']='first-party and roaming/aggregated'
        if id=='ntpc':extra['provenance_type']='government allocation evidence; CPO own feed not verified'
        if id=='fortum':extra['recommended_ingestion']='Resolve legacy operator alias to GLIDA; do not double-count old and new brands.'
        add(id,n,o,u,**extra)
    add('tata-xprest','Tata XPRES-T station table','Tata Motors','https://xprest.tatamotors.com/electric/chargingpoint','India',
        provenance_type='aggregated',data_type='station names and addresses; no coordinates',endpoint='https://xprest.tatamotors.com/electric/chargingpoint',
        endpoint_class='VERIFIED',http_method='GET',authentication='none',api_key_required=False,realtime='STATIC',data_format='HTML table',
        recommended_ingestion='Address-only discovery queue; publisher warns information may not be up to date. Do not geocode automatically under unverified license.')
    add('osm','OpenStreetMap / Overpass','OSM contributors; VK Maps public Overpass','https://wiki.openstreetmap.org/wiki/Overpass_API','India/global',
        organization_country=None,covers_delhi_ncr=True,api_availability='Overpass QL',endpoint='https://maps.mail.ru/osm/tools/overpass/api/interpreter',endpoint_class='VERIFIED',
        http_method='POST',parameters={'data':'[out:json][timeout:90];area["ISO3166-1"="IN"]["admin_level"="2"]->.india;nwr["amenity"="charging_station"](area.india);out center meta;'},
        authentication='none',api_key_required=False,pagination='No cursor; complete query or split by geographic scope',geographic_filtering='area, bbox, around',
        station_filtering='OSM node/way/relation ID',realtime='STATIC',realtime_evidence='OSM edit timestamps describe edits, not charger heartbeat',
        data_format='JSON elements',static_or_dynamic='dynamic inventory',license='ODbL-1.0',automation_permission='allowed subject to instance policy and ODbL',
        provenance_type='community',station_count=600,last_observed_update='OSM base 2026-10-04T18:55:04Z; per-feature edit timestamps retained',
        recommended_ingestion='Weekly national extract/diff and daily priority-area changes; attribute OSM and keep license-aware derived databases.')
    maps=[
        ('google','Google Places API','Google','https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places'),
        ('mappls','Mappls/MapmyIndia','CE Info Systems','https://mapmyindia.github.io/mapmyindia-rest-api/'),
        ('apple','Apple Maps Server API','Apple','https://developer.apple.com/documentation/applemapsserverapi/-v1-search'),
        ('bing-azure','Bing/Azure Maps','Microsoft','https://learn.microsoft.com/en-us/rest/api/maps/search/get-search-poi-category?view=rest-maps-1.0'),
        ('plugshare','PlugShare','PlugShare / Recargo','https://help.plugshare.com/hc/en-us/articles/4418950880659-PlugShare-Charging-Stations-API-Documentation-Access'),
        ('chargehub','ChargeHub','ChargeHub','https://developer.chargehub.com/'),
        ('evmap','EVMap','EVMap open-source project','https://github.com/ev-map/EVMap/blob/master/README.md'),
        ('electromaps','Electromaps','Electromaps','https://www.electromaps.com/en/for-partners'),
        ('chargefinder','ChargeFinder','ChargeFinder','https://chargefinder.com/terms'),
    ]
    for id,n,o,u in maps:add(id,n,o,u,'Global; India/NCR station-level coverage unmeasured',organization_country=None,
                            covers_delhi_ncr=None,provenance_type='aggregated',automation_permission='contract_or_terms_required',
                            recommended_ingestion='Licensed discovery and cross-validation only; examine storage, caching and attribution restrictions.')
    add('ocpi','OCPI specification','EV Roaming Foundation','https://ocpi.github.io/openapi-specification/ocpi/2.2.1/',
        'Protocol; no geographic dataset',organization_country=None,covers_india=None,data_type='protocol documentation',endpoint_class='DOCUMENTED',
        recommended_ingestion='Discover version and module URLs from authorized CPO feed; no Indian anonymous OCPI feed verified.')
    add('chargeindia','ChargeIndia Hub','ChargeIndia','https://docs.hub.chargeindia.com/api-reference','India advertised; participating CPO station coverage not measured',
        data_type='OCPI partner feed',api_availability='OCPI 2.2.1 documented',endpoint_class='DOCUMENTED',
        authentication='Authorization: Token; partner onboarding',api_key_required=True,automation_permission='contract_required',
        recommended_ingestion='Published paths use {hub-domain}; deployment URL not established. Obtain token and advertised module endpoints; no guessed URL.')
    for row in SOURCES:
        if row['endpoint']:
            row['example_request']={'method':row['http_method'],'url':row['endpoint'],'parameters':row['parameters']}
            row['curl']=f"curl --fail-with-body '{row['endpoint']}'" if row['http_method']=='GET' and not row['api_key_required'] else None
            row['postman_request']=row['example_request']
    (ROOT/'source-inventory.json').write_text(json.dumps(SOURCES,indent=2,ensure_ascii=False))
    with (ROOT/'source-inventory.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,list(SOURCES[0]));w.writeheader()
        for r in SOURCES:w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()})
    lines=['# Source inventory','', 'Counts are measured records/site groups or explicit historical document totals; they are not interchangeable. Unknown means not established in this investigation.','',
           '| Source | Authority | Coverage | Station Count | Live Status | API | Endpoint / evidence | Auth | Update Frequency | License | Reliability |',
           '|---|---|---|---:|---|---|---|---|---|---|---|']
    for r in SOURCES:
        values=[r['name'],r['organization'],r['coverage'],str(r['station_count']) if r['station_count'] is not None else 'unknown',
                r['realtime'],r['api_availability'],(r['endpoint'] or r['source_url'])+' ('+r['endpoint_class']+')',r['authentication'],r['update_frequency'],r['license'],r['reliability']]
        lines.append('| '+' | '.join(x.replace('|','/').replace('\n',' ') for x in values)+' |')
    (ROOT/'SOURCE_INVENTORY.md').write_text('\n'.join(lines)+'\n')
    detailed=['# API directory','', 'VERIFIED requires a successful station payload, not merely HTTP 200. DOCUMENTED is an official published specification. OBSERVED means present in page/script or unsuccessful reproduction. UNVERIFIED means no station endpoint was established. Permissions are a separate gate.','']
    for r in SOURCES:
        detailed += ['## '+r['name'],'']+[f'- **{k}:** '+(json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else str(v) if v is not None else 'unknown / not obtained') for k,v in r.items()]+['']
    (ROOT/'API_DIRECTORY.md').write_text('\n'.join(detailed))
    print(f'Wrote {len(SOURCES)} sources')


if __name__=='__main__':build()
