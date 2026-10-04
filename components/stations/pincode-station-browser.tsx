"use client";

import { useState } from "react";

import { StationCard } from "@/components/stations/station-card";
import { StationCardSkeleton } from "@/components/ui/skeletons";
import {
  apiClient,
  type PincodeDetailResponse,
  type PincodeStationItem,
} from "@/lib/api";

export type PincodeStationResult = PincodeDetailResponse;

interface PincodeStationBrowserProps {
  initialResult: PincodeStationResult;
  pincode: string;
  cityName: string;
  stateName: string;
  className?: string;
  onStationsChange?: (stations: PincodeStationItem[]) => void;
}

export function PincodeStationBrowser({
  initialResult,
  pincode,
  cityName,
  stateName,
  className = "",
  onStationsChange,
}: PincodeStationBrowserProps) {
  const [stations, setStations] = useState<PincodeStationItem[]>(initialResult.stations);
  const [radiusKm, setRadiusKm] = useState<number>(initialResult.radiusKm);
  const [page, setPage] = useState<number>(initialResult.pagination.page);
  const [total, setTotal] = useState<number>(initialResult.total);
  const [exactCount, setExactCount] = useState<number>(initialResult.exactPincodeCount);
  const [nearbyCount, setNearbyCount] = useState<number>(initialResult.nearbyPincodeCount);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = initialResult.pagination.pageSize || 20;
  const hasMore = stations.length < total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const radiusOptions = [5, 10, 25, 50];

  const handleRadiusChange = async (newRadius: number) => {
    if (loading || newRadius === radiusKm) return;
    setLoading(true);
    setError(null);
    setRadiusKm(newRadius);

    try {
      const data = await apiClient.getPincode(pincode, { radiusKm: newRadius, page: 1, pageSize });

      if (data && Array.isArray(data.stations)) {
        setStations(data.stations);
        setTotal(data.total);
        setExactCount(data.exactPincodeCount);
        setNearbyCount(data.nearbyPincodeCount);
        setPage(1);
        onStationsChange?.(data.stations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error searching nearby stations");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const nextPage = page + 1;

    try {
      const data = await apiClient.getPincode(pincode, { radiusKm, page: nextPage, pageSize });

      if (data && Array.isArray(data.stations)) {
        setStations((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newStations = data.stations.filter(
            (s: PincodeStationItem) => !existingIds.has(s.id),
          );
          const combined = [...prev, ...newStations];
          onStationsChange?.(combined);
          return combined;
        });
        setPage(nextPage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading more stations");
    } finally {
      setLoading(false);
    }
  };

  const exactStations = stations.filter((s) => s.matchType === "exact_pincode");
  const nearbyStations = stations.filter((s) => s.matchType !== "exact_pincode");

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Radius Controls & Discovery Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-white shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[var(--color-dark-green)]">
            Geographic Radius:
          </span>
          <div className="flex items-center gap-1.5">
            {radiusOptions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRadiusChange(r)}
                disabled={loading}
                className={`min-h-8 rounded-lg px-3 text-xs font-bold transition-all focus-visible:outline-none ${
                  radiusKm === r
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "bg-gray-100 text-[var(--color-dark-green)] hover:bg-gray-200"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] flex-wrap">
          <span>Found</span>
          <strong className="text-[var(--color-dark-green)]">{total}</strong>
          <span>verified stations</span>
          {exactCount > 0 ? (
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
              {exactCount} in PIN {pincode}
            </span>
          ) : nearbyCount > 0 ? (
            <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 font-bold text-sky-800">
              {nearbyCount} in nearby PINs
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
              Geographic radius search
            </span>
          )}
        </div>
      </div>

      {/* Case Differentiation Banner */}
      {exactCount === 0 && total > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 flex items-start gap-3">
          <span className="text-xl">📍</span>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">
              No charging stations are listed directly in PIN {pincode}
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              We expanded discovery geographically to find{" "}
              <strong>{total} public charging stations</strong> in nearby areas within a{" "}
              <strong>{radiusKm} km</strong> radius across {cityName}, {stateName}.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Empty State */}
      {stations.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 p-8 sm:p-12 text-center space-y-3">
          <div className="text-3xl">🔍</div>
          <h3 className="text-base font-bold text-[var(--color-dark-green)]">
            No charging stations found within {radiusKm} km of PIN {pincode}
          </h3>
          <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">
            Try expanding the search radius to 25 km or 50 km using the buttons above, or explore
            chargers across {cityName}.
          </p>
        </div>
      )}

      {/* Stations List: When exact stations exist, show them first */}
      {exactStations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <h3 className="text-lg font-bold tracking-tight text-[var(--color-dark-green)] flex items-center gap-2">
              <span>🎯 In PIN {pincode}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {exactStations.length}
              </span>
            </h3>
            <span className="text-xs text-[var(--color-muted)]">Direct postal code match</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exactStations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>
      )}

      {/* Nearby Stations Section */}
      {nearbyStations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
            <h3 className="text-lg font-bold tracking-tight text-[var(--color-dark-green)] flex items-center gap-2">
              <span>⚡ Nearby Charging Stations</span>
              <span className="rounded-full bg-[var(--color-light-green)] px-2 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
                {nearbyStations.length}
              </span>
            </h3>
            <span className="text-xs text-[var(--color-muted)]">
              Within {radiusKm} km · Sorted by real distance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyStations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <StationCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Pagination & Load More */}
      <div className="flex flex-col items-center justify-center pt-2 pb-2 gap-2">
        {hasMore ? (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 font-bold text-sm text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>Searching stations...</span>
              </>
            ) : (
              <>
                <span>⚡ Load More Nearby Stations</span>
                <span className="text-xs bg-white/25 rounded-md px-2 py-0.5 font-semibold">
                  {stations.length} of {total}
                </span>
              </>
            )}
          </button>
        ) : total > 0 ? (
          <div className="text-xs font-semibold text-[var(--color-secondary-green)] bg-[var(--color-light-green)] px-4 py-2 rounded-full border border-[var(--color-primary)]/20">
            ✓ All {total} verified stations loaded for PIN {pincode}
          </div>
        ) : null}

        {total > pageSize && (
          <span className="text-xs text-[var(--color-muted)]">
            Page {page} of {totalPages} · {pageSize} stations per page
          </span>
        )}
      </div>
    </div>
  );
}
