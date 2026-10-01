"use client";

import Link from "next/link";
import React from "react";

import { ConnectorBadge } from "@/components/ui/connector-badge";
import { PowerBadge } from "@/components/ui/power-badge";
import { SavedButton } from "@/components/ui/saved-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MockStation } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface StationCardProps {
  station: MockStation;
  className?: string;
  onSelect?: (station: MockStation) => void;
  selected?: boolean;
}

export function StationCard({
  station,
  className = "",
  onSelect,
  selected = false,
}: StationCardProps) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <article
      id={`station-card-${station.id}`}
      onClick={() => onSelect?.(station)}
      className={`relative rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 ${
        selected
          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 shadow-md bg-emerald-50/30"
          : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60 hover:shadow-md hover:-translate-y-0.5"
      } ${onSelect ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-start gap-3 mb-2">
        {/* Left: Station Monogram / Thumbnail matching Screen 2 */}
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-[var(--color-primary)] font-black text-base flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs mt-0.5">
          ⚡
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                {station.operator.name}
              </span>
              {station.distanceKm !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{station.distanceKm} km</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <StatusBadge status={station.status} size="sm" />
              <SavedButton stationSlug={station.slug} stationName={station.name} compact />
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-dark-green)] truncate">
            {onSelect ? (
              <span className="hover:text-[var(--color-primary)] transition-colors">
                {station.name}
              </span>
            ) : (
              <Link
                href={routeUrls.station(station.slug)}
                className="hover:text-[var(--color-primary)] transition-colors focus-visible:outline-none"
              >
                {station.name}
              </Link>
            )}
          </h3>

          <p className="text-xs text-[var(--color-muted)] line-clamp-1 mt-0.5 mb-2.5">
            {station.address}
            {station.pincode ? ` · PIN ${station.pincode}` : ""}
          </p>

          {/* Connectors & Power Row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <PowerBadge powerKw={station.fastestPowerKw} />
            {station.connectors.map((c) => (
              <ConnectorBadge key={c.id} type={c.type} quantity={c.quantity} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-[var(--color-border)]/70 flex items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
        <span className="truncate text-[11px] font-medium">🕒 Open 24/7</span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-white px-3 font-semibold text-[var(--color-dark-green)] border border-[var(--color-border)] hover:bg-[var(--color-light-green)] hover:border-[var(--color-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <svg
              className="w-3.5 h-3.5 text-[var(--color-primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span>Directions</span>
          </a>
          <Link
            href={routeUrls.station(station.slug)}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--color-primary)] px-3.5 font-semibold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
