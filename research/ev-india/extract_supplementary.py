"""Extract address-only OEM leads and the static DTL project table offline."""
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parent


class TableRows(HTMLParser):
    def __init__(self):
        super().__init__();self.rows=[];self.row=None;self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr':self.row=[]
        elif tag=='td' and self.row is not None:self.cell=[]
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag=='td' and self.cell is not None:
            self.row.append(' '.join(' '.join(self.cell).split()));self.cell=None
        elif tag=='tr' and self.row is not None:
            if len(self.row)==2 and all(self.row):self.rows.append(self.row)
            self.row=None


def extract():
    parser=TableRows();parser.feed((ROOT/'evidence/tata-xprest.html').read_text())
    tata=[dict(name=r[0],address=r[1],source_record_id=f'table-row-{i+1}',
               source_url='https://xprest.tatamotors.com/electric/chargingpoint',
               source='tata-xprest',live_status='unknown',coordinate_status='not_provided') for i,r in enumerate(parser.rows)]
    (ROOT/'evidence/tata-address-rows.json').write_text(json.dumps(tata,indent=2,ensure_ascii=False))
    pdf=ROOT/'evidence/dtl-78.pdf';xml=ROOT/'evidence/dtl-78.xml'
    subprocess.run(['pdftotext','-bbox-layout',str(pdf),str(xml)],check=True)
    ns='{http://www.w3.org/1999/xhtml}'
    records=[]
    for page_index,page in enumerate(ET.parse(xml).findall('.//'+ns+'page')):
        words=[dict(x=float(w.attrib['xMin']),y=float(w.attrib['yMin']),text=w.text or '') for w in page.findall('.//'+ns+'word')]
        anchors=sorted((w for w in words if 75<w['x']<85 and w['text'].isdigit()),key=lambda w:w['y'])
        for i,a in enumerate(anchors):
            low=(a['y']+anchors[i-1]['y'])/2 if i else a['y']-8
            high=(a['y']+anchors[i+1]['y'])/2 if i+1<len(anchors) else a['y']+8
            selected=sorted((w for w in words if low<=w['y']<high),key=lambda w:(round(w['y'],1),w['x']))
            def cell(lo,hi):return ' '.join(w['text'] for w in selected if lo<=w['x']<hi)
            coordinates=cell(244,295)
            m=re.fullmatch(r'\s*(\d+\.\d+)\s*,\s*(\d+\.\d+)\s*',coordinates)
            records.append(dict(id=a['text'],name=cell(88,187),district=cell(187,244),operator=cell(295,372),
                                latitude=m[1] if m else None,longitude=m[2] if m else None,
                                coordinates_raw=coordinates,raw_table_region=' '.join(w['text'] for w in selected),
                                pdf_page=page_index+1,quality_note='Vertical midpoint extraction; full row text retained for review',
                                dataset_date=None,event_date='2024-12-04',date_basis='event referenced in document header, not a publication date',
                                charging_points_raw=cell(501,530),swapping_facilities_raw=cell(530,559)))
    assert sorted(int(r['id']) for r in records)==list(range(1,79))
    (ROOT/'evidence/dtl-rows.json').write_text(json.dumps(records,indent=2,ensure_ascii=False))
    print(json.dumps({'tata_address_rows':len(tata),'dtl_rows':len(records),'dtl_coordinates_parsed':sum(r['latitude'] is not None for r in records)}))


if __name__=='__main__':extract()
