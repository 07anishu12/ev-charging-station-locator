export function StationListPlaceholder() {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 text-sm text-[var(--color-muted)]">
      Station results will appear here once the PostGIS-backed repository is connected.
    </div>
  );
}
