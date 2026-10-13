# Distributed dataset sources

The repository includes a dated canonical inventory and the ten research exports used to assemble it. Research files retain rejected/unresolved records. The canonical snapshot contains discoverable records after ingestion and reconciliation.

| Source | Attribution / source | License recorded in research metadata |
| --- | --- | --- |
| Open Charge Map | OCM contributors and each original provider; [data guidance](https://openchargemap.org/develop) | Community CC BY 4.0; imported records retain provider licenses, including some CC0 |
| OpenStreetMap | © OpenStreetMap contributors; [copyright/attribution](https://www.openstreetmap.org/copyright) | ODbL-1.0; applicable attribution/database share-alike obligations remain |
| BEE | Bureau of Energy Efficiency / Ministry of Power; [observed public dataset](https://www.beeindia.gov.in/WriteReadData/RTF1984/EV_PCS_Data_29277.pdf) | Explicit redistribution license was not established in the source inventory |
| Delhi EV map | Delhi Transport Department; [station map](https://ev.delhi.gov.in/charging_station) | Explicit dataset license was not established |
| Delhi Transco | Delhi Transco Limited; exact source documents retained in `station-sources.csv` | Explicit dataset license was not established |

This repository does not relicense the entire aggregation as CC BY or grant ownership of third-party data. Preserve provider, source URL, license and attribution. Review unresolved source permissions before further/commercial redistribution. OCM's guidance requires checking the original provider's license; imported records do not all use the community license.

## File inventory

- `snapshot/india-charging.json.gz`: canonical records loaded after the tracked SQL migrations.
- `snapshot/manifest.json`: measured table counts, export date, SHA-256 and migration journal checksum.
- `research-manifest.json`: file paths, byte sizes, checksums and CSV row counts for all research exports.
- `../research/ev-india/datasets/station-sources.csv`: original identities, URLs, provenance, licenses and attribution.
- `../research/ev-india/datasets/india-master.csv`: normalized research inventory and related quality/discovery exports.

The snapshot includes geography, stations, connectors, providers, mappings, ingestion history, operational observations and quality records. Private environment files, API keys, MongoDB analytics, database volumes, raw webpage downloads, object-storage payloads and quarantined synthetic fixtures are excluded. Historical ingestion metadata can reference the maintainer's original local artifacts; these are not needed for station discovery.

Original observation timestamps are preserved. Freshness is calculated at runtime, so an old snapshot must not be presented as a current live feed. A missing source license remains missing.
