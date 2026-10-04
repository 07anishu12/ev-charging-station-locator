"use client";

import { useState } from "react";

import { StationCard } from "@/components/stations/station-card";
import { StationCardSkeleton } from "@/components/ui/skeletons";
import { apiClient } from "@/lib/api";
import type { Station } from "@fastcharger/shared";

interface CityStationBrowserProps {
  initialStations: Station[];
  citySlug: string;
  cityName: string;
  totalStations: number;
  pageSize?: number;
  initialPage?: number;
  className?: string;
}

export function CityStationBrowser({
  initialStations,
  citySlug,
  cityName,
  totalStations,
  pageSize = 20,
  initialPage = 1,
  className = "",
}: CityStationBrowserProps) {
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [page, setPage] = useState<number>(initialPage);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalStations / pageSize));
  const hasMore = stations.length < totalStations;

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const nextPage = page + 1;

    try {
      const data = await apiClient.getCity(citySlug, { page: nextPage, pageSize });
      if (data && Array.isArray(data.stations)) {
        setStations((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newStations = data.stations.filter(
            (s: Station) => !existingIds.has(s.id),
          );
          return [...prev, ...newStations];
        });
        setPage(nextPage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading more stations");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`space-y-5 ${className}`}>
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--color-border)] pb-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Charging Stations in {cityName}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-muted)]">
            Verified public EV chargers with real-time speed, connector, and operator specifications
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center rounded-lg bg-[var(--color-light-green)] px-3 py-1 text-xs font-bold text-[var(--color-secondary-green)]">
            Showing {stations.length} of {totalStations} stations
          </span>
        </div>
      </div>

      {/* Station Cards */}
      {stations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 sm:p-12 text-center">
          <h3 className="text-base font-semibold text-[var(--color-dark-green)]">
            No charging stations found in {cityName}
          </h3>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Check back later as new charging stations are cataloged.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {[...Array(2)].map((_, i) => (
            <StationCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Load More & Pagination Controls */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 gap-3">
        {hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 font-bold text-sm text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>Loading more stations...</span>
              </>
            ) : (
              <>
                <span>⚡ Load More Stations</span>
                <span className="text-xs bg-white/25 rounded-md px-2 py-0.5 font-semibold">
                  {stations.length} of {totalStations}
                </span>
              </>
            )}
          </button>
        ) : totalStations > 0 ? (
          <div className="text-xs font-semibold text-[var(--color-secondary-green)] bg-[var(--color-light-green)] px-4 py-2 rounded-full border border-[var(--color-primary)]/20">
            ✓ All {totalStations} verified stations loaded in {cityName}
          </div>
        ) : null}

        {totalStations > pageSize && (
          <span className="text-xs text-[var(--color-muted)]">
            Page {page} of {totalPages} · {pageSize} stations per page
          </span>
        )}
      </div>
    </section>
  );
}
