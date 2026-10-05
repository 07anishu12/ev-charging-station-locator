import React from "react";
import type { Station } from "@fastcharger/shared";

interface StationAboutCardProps {
  station: Station;
  className?: string;
}

export function StationAboutCard({ station, className = "" }: StationAboutCardProps) {
  return (
    <section className={`rounded-3xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs ${className}`}>
      <h2 className="text-base sm:text-lg font-bold text-[var(--color-dark-green)] mb-3">
        About this Station
      </h2>

      <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed mb-6">
        {station.name} is a provider-reported EV charging station located at {station.address} ({station.city.name}, {station.state.name}) operated by {station.operator.name}. Connector and power information reflect available source reports.
      </p>

      {/* Metadata Rows matching Screen 3 */}
      <div className="space-y-4 pt-4 border-t border-[var(--color-border)]/60 text-xs sm:text-sm">
        {/* Operator */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Operator</span>
          </div>
          <span className="font-bold text-[var(--color-dark-green)]">{station.operator.name}</span>
        </div>

        {/* Usage Type */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium">Usage Type</span>
          </div>
          <span className="font-bold text-[var(--color-dark-green)]">{station.usageType || "Unknown"}</span>
        </div>

        {/* Address */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[var(--color-muted)] shrink-0">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Address</span>
          </div>
          <span className="font-semibold text-right text-[var(--color-dark-green)] max-w-xs">
            {station.address}
            {station.pincode ? `, PIN ${station.pincode}` : ""}
          </span>
        </div>

        {/* Amenities */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 text-[var(--color-muted)] shrink-0">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-medium">Amenities</span>
          </div>
          <span className="font-semibold text-right text-[var(--color-secondary-green)]">
            Not verified
          </span>
        </div>
      </div>
    </section>
  );
}
