"use client";

import Link from "next/link";

import { ConnectorBadge } from "@/components/ui/connector-badge";
import { PowerBadge } from "@/components/ui/power-badge";
import { SavedButton } from "@/components/ui/saved-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { MockStation } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface StationBottomSheetProps {
  station: MockStation | null;
  onClose: () => void;
  className?: string;
}

export function StationBottomSheet({ station, onClose, className = "" }: StationBottomSheetProps) {
  if (!station) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;

  return (
    <div
      className={`fixed bottom-16 inset-x-0 z-40 p-4 md:hidden animate-bottom-sheet-in ${className}`}
    >
      <div className="relative rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-2xl">
        {/* Drag handle / close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              {station.operator.name}
            </span>
            {station.distanceKm !== undefined && (
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
                {station.distanceKm} km away
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <SavedButton stationSlug={station.slug} stationName={station.name} compact />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close station preview"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-[var(--color-dark-green)] leading-snug mb-1">
          {station.name}
        </h3>
        <p className="text-xs text-[var(--color-muted)] line-clamp-1 mb-3">{station.address}</p>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <StatusBadge status={station.status} size="sm" />
          <PowerBadge powerKw={station.fastestPowerKw} />
          {station.connectors.map((c) => (
            <ConnectorBadge key={c.id} type={c.type} />
          ))}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white font-semibold text-sm text-[var(--color-dark-green)] hover:bg-[var(--color-light-green)] transition-colors"
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
