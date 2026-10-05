export const WEEK = 7 * 24 * 60 * 60;
export interface ProviderDefinition {
  providerId: string; providerName: string; providerType: string; enabled: boolean;
  providerStatus: 'READY' | 'ACCESS_REQUIRED' | 'MANUAL_IMPORT';
  supportsStationData: boolean; supportsStatusData: boolean; supportsConnectorData: boolean;
  supportsPricing: boolean; supportsLiveAvailability: boolean;
  refreshIntervalSeconds: number; statusIntervalSeconds: number | null; termsNotes: string;
}
function provider(providerId: string, providerName: string, providerType: string, termsNotes: string,
  options: Partial<ProviderDefinition> = {}): ProviderDefinition {
  return { providerId, providerName, providerType, enabled: false, providerStatus: 'ACCESS_REQUIRED',
    supportsStationData: false, supportsStatusData: false, supportsConnectorData: false,
    supportsPricing: false, supportsLiveAvailability: false, refreshIntervalSeconds: WEEK,
    statusIntervalSeconds: null, termsNotes, ...options };
}
export const PROVIDERS: ProviderDefinition[] = [
  provider('open-charge-map','Open Charge Map','OPEN_CHARGE_MAP','Official API; OCM_API_KEY. Community CC BY 4.0; imported records retain their licenses. Static operational reports, no verified live feed.',
    { enabled:true, providerStatus:'READY',supportsStationData:true,supportsConnectorData:true,supportsStatusData:true }),
  provider('bee','Bureau of Energy Efficiency','BEE','Official public PDF. API credentials/endpoint not established; redistribution license not established. Snapshot IDs are derived site hashes, not official BEE IDs.',
    { enabled:true,providerStatus:'READY',supportsStationData:true,supportsConnectorData:true }),
  provider('delhi-ev','Delhi Transport Department','STATE_GOVERNMENT','Official publicly visible map inventory; manual import only until machine-readable automation permission is established.',
    { providerStatus:'MANUAL_IMPORT',supportsStationData:true,supportsConnectorData:true }),
  provider('dtl','Delhi Transco Limited','STATE_GOVERNMENT','Official public tender PDF; historical inventory, manual import.',
    { providerStatus:'MANUAL_IMPORT',supportsStationData:true }),
  provider('osm','OpenStreetMap','OTHER_LICENSED_PROVIDER','ODbL attribution required. Secondary discovery evidence, not operational authority.',
    { providerStatus:'MANUAL_IMPORT',supportsStationData:true,supportsConnectorData:true }),
  ...['Jio-bp','Tata Power','ChargeZone','Statiq','Zeon','Ather','Kazam','Bolt.Earth','Fortum','ChargeGrid','EESL'].map(name =>
    provider(name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),name,'CPO_API',name==='Bolt.Earth'?'Official Discovery API offers availability, pricing and connector discovery. Consultation/access terms and credentials required; no authorized feed configured. https://bolt.earth/discovery-api':'ACCESS_REQUIRED: no authorized station/status API credential or automation license in this workspace. Capabilities unverified; contact provider for access. Statiq automated scraping excluded.')),
  provider('chargeindia-ocpi','ChargeIndia Hub','CPO_API','Official documentation requires commercial agreement and assigned OCPI credentials: https://docs.hub.chargeindia.com/getting-started'),
];
export function getProviderDefinition(id: string): ProviderDefinition {
  const found=PROVIDERS.find(p=>p.providerId===id);
  if (!found) throw new Error(`Provider is not registered: ${id}`);
  return found;
}
