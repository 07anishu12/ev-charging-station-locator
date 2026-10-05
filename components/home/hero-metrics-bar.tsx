import React from "react";

interface HeroMetricsBarProps {
  totalStations: number;
  totalCities: number;
  totalOperators?: number;
  className?: string;
}

export function HeroMetricsBar({
  totalStations,
  totalCities,
  className = "",
}: HeroMetricsBarProps) {
  return (
    <div
      className={`grid grid-cols-3 divide-x divide-[var(--color-border)]/60 max-w-xl mx-auto w-full py-4 border-y border-[var(--color-border)]/60 my-6 ${className}`}
    >
      {/* 1. Charging Stations */}
      <div className="flex flex-col items-center text-center px-2">
        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[var(--color-primary)] flex items-center justify-center mb-1.5 shadow-2xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-base sm:text-xl font-black text-[var(--color-dark-green)] tracking-tight">
          {totalStations.toLocaleString()}
        </span>
        <span className="text-[11px] font-medium text-[var(--color-muted)]">
          Charging Stations
        </span>
      </div>

      {/* 2. Cities */}
      <div className="flex flex-col items-center text-center px-2">
        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[var(--color-primary)] flex items-center justify-center mb-1.5 shadow-2xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
          </svg>
        </div>
        <span className="text-base sm:text-xl font-black text-[var(--color-dark-green)] tracking-tight">
          {totalCities.toLocaleString()}
        </span>
        <span className="text-[11px] font-medium text-[var(--color-muted)]">
          Cities Covered
        </span>
      </div>

      {/* 3. India Wide Coverage */}
      <div className="flex flex-col items-center text-center px-2">
        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[var(--color-primary)] flex items-center justify-center mb-1.5 shadow-2xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.6 9h16.8M3.6 15h16.8" />
          </svg>
        </div>
        <span className="text-base sm:text-xl font-black text-[var(--color-dark-green)] tracking-tight">
          India
        </span>
        <span className="text-[11px] font-medium text-[var(--color-muted)]">
          Wide Coverage
        </span>
      </div>
    </div>
  );
}
