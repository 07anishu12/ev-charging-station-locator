"use client";

import Link from "next/link";
import React from "react";

import { ChargingPulse } from "@/components/ui/charging-pulse";
import { ConnectorBadge } from "@/components/ui/connector-badge";
import { PowerBadge } from "@/components/ui/power-badge";
import { SavedButton } from "@/components/ui/saved-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MockStation } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface FeaturedStationCardProps {
  station: MockStation;
  className?: string;
}

export function FeaturedStationCard({
  station,
  className = "",
}: FeaturedStationCardProps) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <article
      id={`featured-station-${station.id}`}
      className={`group relative rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-100/30 p-6 sm:p-7 shadow-md transition-all duration-300 hover:shadow-xl hover:border-emerald-500/60 flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Decorative Energy Radial Glow */}
      <div
        className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700"
        aria-hidden="true"
      />

      {/* Top Banner: Featured Pill + Live Status + Save Button */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-dark-green)] px-3 py-1 text-xs font-bold text-emerald-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            FEATURED FAST HUB
          </span>
          <StatusBadge status={station.status} />
        </div>
        <SavedButton stationSlug={station.slug} stationName={station.name} />
      </div>

      {/* Station Operator, Title, Address */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
            {station.operator.name}
          </span>
          <span className="text-[var(--color-muted)]">•</span>
          <span className="text-xs text-[var(--color-muted)]">
            {station.city.name}, {station.state.name}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-[var(--color-text)] tracking-tight leading-tight group-hover:text-[var(--color-secondary-green)] transition-colors">
          <Link href={routeUrls.station(station.slug)} className="focus:outline-none">
            {station.name}
          </Link>
        </h3>

        <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed line-clamp-2">
          {station.address}
        </p>
      </div>

      {/* Charging Pulse & Power Display Bar */}
      <div className="relative z-10 my-2 rounded-2xl bg-white/90 backdrop-blur-xs border border-emerald-100 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PowerBadge powerKw={station.fastestPowerKw} />
            <span className="text-xs font-semibold text-[var(--color-muted)]">
              High Voltage Rapid Charge
            </span>
          </div>
          <ChargingPulse size="sm" theme="emerald" label="Live Ready" />
        </div>
      </div>

      {/* Connectors */}
      <div className="relative z-10 mt-4 mb-6">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">
          Available Connectors
        </div>
        <div className="flex flex-wrap gap-1.5">
          {station.connectors.map((c) => (
            <ConnectorBadge key={c.id} type={c.type} quantity={c.quantity} />
          ))}
        </div>
      </div>

      {/* Action Footer: Directions & View Details Buttons */}
      <div className="relative z-10 pt-4 border-t border-emerald-200/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-600 active:scale-98 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Get Directions
        </a>

        <Link
          href={routeUrls.station(station.slug)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--color-text)] hover:bg-emerald-50 hover:text-[var(--color-secondary-green)] active:scale-98 transition-all"
        >
          View Station
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}
