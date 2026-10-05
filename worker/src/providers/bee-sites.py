"""Reuse the audited BEE PDF extractor; site IDs match the research snapshot.

Requires pypdf and Poppler. Input PDF stays in ignored local staging.
"""
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'research/ev-india'))
from extract_bee import extract
from build_inventory import clean

rows, errors = extract(Path(sys.argv[1]))
groups = defaultdict(list)
for row in rows:
    groups[(clean(row['operator']), clean(row['address']), row['latitude'], row['longitude'])].append(row)
sites = []
for key, members in groups.items():
    unique = {json.dumps({k: v for k, v in r.items() if k not in ('source_record_id', 'pdf_page', 'pdf_row')}, sort_keys=True): r for r in members}
    sites.append({'id': hashlib.sha256(json.dumps(key).encode()).hexdigest()[:24], 'row': members[0], 'rows': list(unique.values())})
Path(sys.argv[2]).write_text(json.dumps({'sites': sites, 'errors': len(errors)}))
