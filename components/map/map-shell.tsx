interface MapShellProps {
  label?: string;
}

/** Map boundary for Phase 2; no provider data or map UI is rendered yet. */
export function MapShell({ label = "Charging map placeholder" }: MapShellProps) {
  return (
    <div
      aria-label={label}
      className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-light-green)] p-6 text-center text-sm text-[var(--color-muted)]"
      data-map-provider="leaflet"
      role="img"
    >
      Map integration is reserved for the station discovery phase.
    </div>
  );
}
