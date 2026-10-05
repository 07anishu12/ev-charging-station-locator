import type { StationSummary } from '@fastcharger/shared';
import { StatusBadge } from './status-badge';
export function StationStatus({station}:{station:StationSummary}) {
  const live=station.availabilityFreshness==='LIVE';
  const availability=live&&station.availability==='AVAILABLE'?'Available now':live&&station.availability==='PARTIALLY_AVAILABLE'?'Partially available':live&&station.availability==='UNAVAILABLE'?'Unavailable':station.availability==='STALE'?'Availability stale':'Availability unknown';
  const operational=station.operationalStatus==='TEMPORARILY_UNAVAILABLE'?'Temporarily unavailable':station.operationalStatus==='DECOMMISSIONED'?'Decommissioned':null;
  return <div className="space-y-1 text-xs">
    {operational?<span role="status">{operational}</span>:<StatusBadge status={station.status} size="sm" />}
    <div className="text-[var(--color-muted)]">{availability}</div>
    {station.statusObservedAt && <div className="text-[var(--color-muted)]">Last reported <time dateTime={station.statusObservedAt}>{new Date(station.statusObservedAt).toLocaleDateString('en-IN',{timeZone:'UTC'})}</time></div>}
    {station.availabilityObservedAt && <div>Availability checked <time dateTime={station.availabilityObservedAt}>{new Date(station.availabilityObservedAt).toLocaleString('en-IN',{timeZone:'UTC'})} UTC</time></div>}
    <div className="text-[var(--color-muted)]">Source: {station.provenance?.map(p=>p.provider).join(', ')||station.statusSource||'Not established'}{station.manualOverride?' · Internal correction':''}</div>
  </div>;
}
