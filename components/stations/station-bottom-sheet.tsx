"use client";

import Link from "next/link";
import React from "react";

import { ConnectorBadge } from "@/components/ui/connector-badge";
import { PowerBadge } from "@/components/ui/power-badge";
import { SavedButton } from "@/components/ui/saved-button";
import { StationStatus } from "@/components/ui/station-status";
import type { Station } from "@fastcharger/shared";
import { routeUrls } from "@/lib/utils/url";

interface StationBottomSheetProps {
  station: Station | null;
  onClose: () => void;
  className?: string;
}

export function StationBottomSheet({ station, onClose, className = "" }: StationBottomSheetProps) {
  if (!station) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <div
      className={`fixed bottom-16 inset-x-0 z-40 p-3 sm:p-4 md:hidden animate-bottom-sheet-in ${className}`}
    >
      <div className="relative rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-2xl overflow-hidden">
        {/* Subtle energy beam illuminating across the top border once on open */}
        <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent animate-sheet-energy" />
        </div>

        {/* Native drag handle bar matching Screen 2 */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 opacity-70" />

        {/* Header row: Operator + Distance + Save + Close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              {station.operator.name}
            </span>
            {station.distanceKm !== undefined && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
                {station.distanceKm} km away
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <SavedButton stationSlug={station.slug} stationName={station.name} compact />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close station preview"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Station Name with Operator Monogram / Thumbnail */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-[var(--color-primary)] font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
            ⚡
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-dark-green)] leading-tight truncate">
              {station.name}
            </h3>
            <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">{station.address}</p>
          </div>
        </div>

        {/* Badges row: Status + 24/7 + Power + Connectors */}
        <div className="flex flex-wrap items-center gap-1.5 my-3">
          <StationStatus station={station} />
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
            🕒 Hours unknown
          </span>
          <PowerBadge powerKw={station.fastestPowerKw} />
          {station.connectors.map((c) => (
            <ConnectorBadge key={c.id} type={c.type} />
          ))}
        </div>

        {/* Action buttons: Directions & View Station */}
        <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white font-semibold text-sm text-[var(--color-dark-green)] hover:bg-[var(--color-light-green)] hover:border-[var(--color-primary)] transition-colors"
          >
            <svg
              className="w-4 h-4 text-[var(--color-primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Directions</span>
          </a>
          <Link
            href={routeUrls.station(station.slug)}
            className="flex-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-primary)] font-semibold text-sm text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-colors"
          >
            View Station
          </Link>
        </div>
      </div>
    </div>
  );
}
