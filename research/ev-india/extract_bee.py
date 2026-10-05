"""Extract BEE's observed Excel-export PDF using drawn cell boundaries.

Requires installed pypdf and Poppler pdftotext. No OCR, guessed rows, or network.
Each row retains its PDF page and row number; these are snapshot IDs, not CPO IDs.
"""
import bisect
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT = Path(__file__).resolve().parent
FIELDS = ['operator', 'ownership', 'state', 'district', 'city', 'address',
          'latitude', 'longitude', 'connector_type', 'charger_rating_kw',
          'connector_rating_kw', 'connector_count']


def extract(pdf, limit=None):
    xml = pdf.with_suffix('.xml')
    if not xml.exists() or xml.stat().st_mtime < pdf.stat().st_mtime:
        subprocess.run(['pdftotext', '-bbox-layout', str(pdf), str(xml)], check=True)
    reader = PdfReader(pdf)
    namespace = '{http://www.w3.org/1999/xhtml}'
    xml_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', xml.read_text())
    pages = ET.fromstring(xml_text).findall('.//' + namespace + 'page')
    records, errors = [], []
    for page_index, page_xml in enumerate(pages[:limit]):
        page = reader.pages[page_index]
        main = ContentStream(page.get_contents(), reader).operations
        transforms = [list(map(float, a)) for a, o in main if o == b'cm']
        if len(transforms) != 3:
            raise ValueError(f'Unexpected PDF transforms on page {page_index + 1}')
        origin_x = transforms[1][4]
        scale = transforms[2][0]
        form = next(iter(page['/Resources']['/XObject'].values())).get_object()
        operations = ContentStream(form, reader).operations
        form_transform = next(a for a, o in operations if o == b'cm')
        origin_y = float(page.mediabox.height) - (
            transforms[0][5] + transforms[1][5] + transforms[2][5]
            + scale * float(form_transform[5]))
        rectangles = [list(map(float, a)) for a, o in operations if o == b're']
        # First column rectangles delimit every physical table row precisely.
        left = min(a[0] for a in rectangles)
        rows = sorted(set((round(origin_y - scale*y, 4),
                           round(origin_y - scale*(y+h), 4))
                          for x, y, w, h in rectangles if abs(x-left) < .01 and h < 0))
        # All rectangles on the first row give the twelve column boundaries.
        first_y = max(a[1] for a in rectangles)
        cols = sorted(set(round(origin_x + scale*x, 4)
                          for x, y, w, h in rectangles if abs(y-first_y) < .01))
        if len(cols) != 12:
            raise ValueError(f'Expected 12 columns, got {len(cols)} on page {page_index+1}')
        cells = [[[] for _ in cols] for _ in rows]
        row_starts = [a for a, b in rows]
        for word in page_xml.findall('.//' + namespace + 'word'):
            x = (float(word.attrib['xMin']) + float(word.attrib['xMax'])) / 2
            y = (float(word.attrib['yMin']) + float(word.attrib['yMax'])) / 2
            ri, ci = bisect.bisect_right(row_starts, y)-1, bisect.bisect_right(cols, x)-1
            if 0 <= ri < len(rows) and 0 <= ci < 12 and y <= rows[ri][1] + .2:
                cells[ri][ci].append((round(float(word.attrib['yMin']), 1), x, word.text or ''))
        for row_index, row in enumerate(cells):
            values = [' '.join(w[2] for w in sorted(cell)) for cell in row]
            if values[0] == 'CPO Name' or not any(values):
                continue
            obj = dict(zip(FIELDS, values))
            obj.update(source_record_id=f'page-{page_index+1}:row-{row_index+1}',
                       pdf_page=page_index+1, pdf_row=row_index+1)
            records.append(obj)
            if not obj['operator'] or not obj['state'] or not obj['address']:
                errors.append({'id': obj['source_record_id'], 'reason': 'missing table cell', 'row': obj})
    return records, errors


if __name__ == '__main__':
    records, errors = extract(ROOT/'evidence/bee-pcs.pdf', int(sys.argv[1]) if len(sys.argv)>1 else None)
    destination = ROOT/'evidence/bee-rows.json'
    destination.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    (ROOT/'evidence/bee-extraction-errors.json').write_text(json.dumps(errors, ensure_ascii=False, indent=2))
    print(json.dumps({'rows': len(records), 'errors': len(errors), 'output': str(destination)}))
