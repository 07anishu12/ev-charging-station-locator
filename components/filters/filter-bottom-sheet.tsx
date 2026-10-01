"use client";

import React, { useState } from "react";
import type { FilterState } from "./filter-chips";

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  operators?: Array<{ name: string; slug: string }>;
}

export function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onApply,
  operators = [
    { name: "Tata Power", slug: "tata-power" },
    { name: "Ather Grid", slug: "ather-grid" },
    { name: "ChargeZone", slug: "chargezone" },
    { name: "Statiq", slug: "statiq" },
    { name: "Jio-bp pulse", slug: "jio-bp" },
  ],
}: FilterBottomSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [distanceKm, setDistanceKm] = useState<number>(25);

  if (!isOpen) return null;

  const handleReset = () => {
    const empty = {};
    setLocalFilters(empty);
    setDistanceKm(25);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Sheet Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-bottom-sheet-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 id="filter-sheet-title" className="text-base font-bold text-[var(--color-dark-green)]">
            Filters
          </h2>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-[var(--color-secondary-green)] hover:underline"
          >
            Reset
          </button>
        </div>

        {/* Scrollable Filter Sections */}
        <div className="overflow-y-auto px-5 py-5 space-y-6 flex-1 text-[var(--color-dark-green)]">
          {/* Section 1: Charger Type */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">
              Charger Type
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, connectorType: undefined })}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  !localFilters.connectorType
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs"
                    : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
              >
                All
              </button>
              {["ccs2", "type2", "chademo", "gbt"].map((type) => {
                const label = type === "ccs2" ? "CCS2" : type === "type2" ? "Type 2" : type === "chademo" ? "CHAdeMO" : "GB/T";
                const isSelected = localFilters.connectorType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setLocalFilters({
                        ...localFilters,
                        connectorType: isSelected ? undefined : type,
                      })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-2xs"
                        : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Charging Speed */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">
              Charging Speed
            </h3>
            <div className="space-y-2">
              {[
                { label: "All Speeds", minKw: undefined },
                { label: "Fast Charging (≥ 50 kW)", minKw: 50 },
                { label: "Ultra Fast Charging (≥ 100 kW)", minKw: 100 },
                { label: "AC Destination Charging (< 50 kW)", minKw: 22 },
              ].map((speed) => {
                const isSelected = localFilters.minPowerKw === speed.minKw;
                return (
                  <button
                    key={speed.label}
                    type="button"
                    onClick={() =>
                      setLocalFilters({
                        ...localFilters,
                        minPowerKw: isSelected ? undefined : speed.minKw,
                      })
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-[var(--color-primary)] text-[var(--color-dark-green)] shadow-2xs"
                        : "bg-white border-[var(--color-border)] text-gray-700 hover:border-[var(--color-primary)]/50"
                    }`}
                  >
                    <span>{speed.label}</span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Availability */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">
              Availability & Status
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, operationalOnly: false })}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  !localFilters.operationalOnly
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() =>
                  setLocalFilters({
                    ...localFilters,
                    operationalOnly: !localFilters.operationalOnly,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  localFilters.operationalOnly
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
              >
                Available Now (Operational)
              </button>
            </div>
          </div>

          {/* Section 4: Operator */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">
              Charging Operator
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLocalFilters({ ...localFilters, operatorSlug: undefined })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  !localFilters.operatorSlug
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                }`}
              >
                All
              </button>
              {operators.map((op) => {
                const isSelected = localFilters.operatorSlug === op.slug;
                return (
                  <button
                    key={op.slug}
                    type="button"
                    onClick={() =>
                      setLocalFilters({
                        ...localFilters,
                        operatorSlug: isSelected ? undefined : op.slug,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "bg-white text-[var(--color-dark-green)] border-[var(--color-border)] hover:border-[var(--color-primary)]"
                    }`}
                  >
                    {op.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Distance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Discovery Distance
              </h3>
              <span className="text-xs font-bold text-[var(--color-secondary-green)]">
                Within {distanceKm} km
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={distanceKm}
              onChange={(e) => setDistanceKm(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--color-primary)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[var(--color-muted)] mt-1 font-medium">
              <span>1 km</span>
              <span>5 km</span>
              <span>10 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>
        </div>

        {/* Bottom CTA Action Button */}
        <div className="p-4 border-t border-[var(--color-border)] bg-white shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-2xl bg-[var(--color-primary)] py-3.5 text-center text-sm font-bold text-white shadow-md hover:bg-emerald-600 active:scale-98 transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
