"use client";

import React, { useState } from "react";
import { FilterBottomSheet } from "./filter-bottom-sheet";

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
  isLoadingLocation?: boolean;
  className?: string;
}

export function FilterChips({
  filters,
  onChange,
  isLoadingLocation = false,
  className = "",
}: FilterChipsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    filters.minPowerKw || filters.connectorType || filters.operationalOnly || filters.nearby || filters.operatorSlug,
  );

  const isAllActive = !filters.minPowerKw && !filters.connectorType && !filters.operationalOnly && !filters.operatorSlug;

  return (
    <>
      <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-2 ${className}`}>
        {/* All Button - Screen 2 Reference Style */}
        <button
          type="button"
          data-testid="filter-all"
          aria-label="Show all chargers"
          aria-pressed={isAllActive}
          onClick={() => {
            onChange({
              nearby: filters.nearby, // preserve nearby if active
            });
          }}
          className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-4 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            isAllActive
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)]"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span>All</span>
        </button>

        {/* CCS2 */}
        <button
          type="button"
          data-testid="filter-ccs2"
          aria-label="Filter CCS2 connectors"
          aria-pressed={filters.connectorType === "ccs2"}
          onClick={() => toggleConnector("ccs2")}
          className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.connectorType === "ccs2"
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)] animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span>CCS2</span>
        </button>

        {/* Type 2 */}
        <button
          type="button"
          data-testid="filter-type2"
          aria-label="Filter Type 2 connectors"
          aria-pressed={filters.connectorType === "type2"}
          onClick={() => toggleConnector("type2")}
          className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.connectorType === "type2"
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)] animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span>Type 2</span>
        </button>

        {/* CHAdeMO */}
        <button
          type="button"
          data-testid="filter-chademo"
          aria-label="Filter CHAdeMO connectors"
          aria-pressed={filters.connectorType === "chademo"}
          onClick={() => toggleConnector("chademo")}
          className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.connectorType === "chademo"
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)] animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span>CHAdeMO</span>
        </button>

        {/* Fast (>50kW) */}
        <button
          type="button"
          data-testid="filter-fast"
          aria-label="Filter fast chargers 50kW and above"
          aria-pressed={filters.minPowerKw === 50}
          onClick={() => toggleMinPower(50)}
          className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.minPowerKw === 50
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)] animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span className="transition-transform duration-200">⚡ Fast (50kW+)</span>
        </button>

        {/* 100kW+ Ultra Fast */}
        <button
          type="button"
          data-testid="filter-100kw"
          aria-label="Filter ultra fast chargers 100kW and above"
          aria-pressed={filters.minPowerKw === 100}
          onClick={() => toggleMinPower(100)}
          className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.minPowerKw === 100
              ? "bg-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(22,199,132,0.35)] animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span className="transition-transform duration-200">⚡ 100kW+ Ultra</span>
        </button>

        {/* Operational */}
        <button
          type="button"
          data-testid="filter-operational"
          aria-label="Filter operational chargers only"
          aria-pressed={Boolean(filters.operationalOnly)}
          onClick={toggleOperational}
          className={`inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.operationalOnly
              ? "bg-[var(--color-dark-green)] text-white shadow-xs animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-status-pulse-once" />
          <span>Operational</span>
        </button>

        {/* Nearby */}
        <button
          type="button"
          data-testid="filter-nearby"
          aria-label="Filter chargers near me"
          aria-pressed={Boolean(filters.nearby)}
          onClick={toggleNearby}
          disabled={isLoadingLocation}
          className={`inline-flex shrink-0 min-h-9 items-center gap-1 rounded-full px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
            filters.nearby
              ? "bg-[var(--color-secondary-green)] text-white shadow-xs animate-chip-charge"
              : "bg-white text-[var(--color-dark-green)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30"
          } ${isLoadingLocation ? "opacity-80 cursor-wait" : ""}`}
        >
          {isLoadingLocation ? (
            <>
              <svg
                className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Locating...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Nearby</span>
            </>
          )}
        </button>

        {/* Smart Filters Modal Trigger Button (Matches Screen 2 & 5) */}
        <button
          type="button"
          data-testid="filter-more-sheet"
          onClick={() => setIsSheetOpen(true)}
          aria-label="Open advanced filter sheet"
          className="inline-flex shrink-0 min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-[var(--color-dark-green)] bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100 hover:border-[var(--color-primary)] active:scale-95 transition-all shadow-2xs"
        >
          <svg className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
          )}
        </button>

        {/* Reset Filters */}
        <button
          type="button"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          aria-disabled={!hasActiveFilters}
          aria-label="Reset filters"
          title={hasActiveFilters ? "Reset active filters" : "No filters active to reset"}
          data-testid="filter-reset"
          className={`inline-flex shrink-0 min-h-9 items-center rounded-full px-3 text-xs font-semibold transition-all duration-150 ${
            hasActiveFilters
              ? "text-rose-600 hover:bg-rose-50 cursor-pointer active:scale-95 shadow-2xs"
              : "text-stone-400 opacity-40 cursor-not-allowed hover:bg-transparent"
          }`}
        >
          Reset
        </button>
      </div>

      {/* Filter Bottom Sheet Modal */}
      <FilterBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          onChange(newFilters);
        }}
      />
    </>
  );
}
