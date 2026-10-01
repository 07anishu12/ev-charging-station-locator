"use client";

export interface FilterState {
  minPowerKw?: number;
  connectorType?: string;
  operationalOnly?: boolean;
  nearby?: boolean;
  operatorSlug?: string;
}

interface FilterChipsProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  className?: string;
}

export function FilterChips({ filters, onChange, className = "" }: FilterChipsProps) {
  const toggleMinPower = (power: number) => {
    onChange({
      ...filters,
      minPowerKw: filters.minPowerKw === power ? undefined : power,
    });
  };

  const toggleConnector = (type: string) => {
    onChange({
      ...filters,
      connectorType: filters.connectorType === type ? undefined : type,
    });
  };

  const toggleOperational = () => {
    onChange({
      ...filters,
      operationalOnly: !filters.operationalOnly,
    });
  };

  const toggleNearby = () => {
    onChange({
      ...filters,
      nearby: !filters.nearby,
    });
  };

  const resetFilters = () => {
    onChange({});
  };

  const hasActiveFilters = Boolean(
    filters.minPowerKw || filters.connectorType || filters.operationalOnly || filters.nearby,
  );

  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-2 ${className}`}>
      {/* Fast (>50kW) */}
      <button
        type="button"
        onClick={() => toggleMinPower(50)}
        className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.minPowerKw === 50
            ? "bg-[var(--color-primary)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span>⚡ Fast (50kW+)</span>
      </button>

      {/* 100kW+ Ultra Fast */}
      <button
        type="button"
        onClick={() => toggleMinPower(100)}
        className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.minPowerKw === 100
            ? "bg-[var(--color-primary)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span>⚡ 100kW+ Ultra</span>
      </button>

      {/* CCS2 */}
      <button
        type="button"
        onClick={() => toggleConnector("ccs2")}
        className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.connectorType === "ccs2"
            ? "bg-[var(--color-primary)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span>CCS2</span>
      </button>

      {/* Type 2 */}
      <button
        type="button"
        onClick={() => toggleConnector("type2")}
        className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.connectorType === "type2"
            ? "bg-[var(--color-primary)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span>Type 2</span>
      </button>

      {/* Operational */}
      <button
        type="button"
        onClick={toggleOperational}
        className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.operationalOnly
            ? "bg-[var(--color-dark-green)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
        <span>Operational</span>
      </button>

      {/* Nearby */}
      <button
        type="button"
        onClick={toggleNearby}
        className={`inline-flex shrink-0 min-h-9 items-center gap-1 rounded-full px-3.5 text-xs font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
          filters.nearby
            ? "bg-[var(--color-secondary-green)] text-white shadow-xs"
            : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)]"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Nearby</span>
      </button>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex shrink-0 min-h-9 items-center rounded-full px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
