"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { StationList } from "@/components/stations/station-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  getMockStationsByPincode,
  type MockStation,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

export default function PincodePage() {
  const params = useParams();
  const stateSlug = Array.isArray(params.state) ? params.state[0] : params.state || "";
  const citySlug = Array.isArray(params.city) ? params.city[0] : params.city || "";
  const pincode = Array.isArray(params.pincode) ? params.pincode[0] : params.pincode || "";

  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [selectedStation, setSelectedStation] = useState<MockStation | null>(null);

  const { stationList, targetCity, targetState } = useMemo(() => {
    return getMockStationsByPincode(pincode, radiusKm);
  }, [pincode, radiusKm]);

  const cityName =
    targetCity ??
    citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const stateName =
    targetState ??
    stateSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const radiusOptions = [5, 10, 25, 50];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumb & Header */}
        <div>
          <Breadcrumbs
            items={[
              { label: "India", href: routeUrls.india() },
              { label: stateName, href: routeUrls.state(stateSlug) },
              { label: cityName, href: routeUrls.city(stateSlug, citySlug) },
              { label: `PIN ${pincode}` },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                Local Area Discovery
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
                EV Charging Stations Near {pincode}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[var(--color-muted)] max-w-2xl">
                Serving {cityName}, {stateName} within a {radiusKm} km radius. Verified locations, power outputs, and connector details.
              </p>
            </div>

            <Link
              href={routeUrls.map({ nearby: true })}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all shrink-0"
            >
              <span>📍 Use My Location</span>
            </Link>
          </div>
        </div>

        {/* Radius Filter & Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--color-border)] bg-white shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-dark-green)]">Search Radius:</span>
            <div className="flex items-center gap-1.5">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
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

          <div className="text-xs text-[var(--color-muted)]">
            Found <strong className="text-[var(--color-dark-green)]">{stationList.length}</strong> stations within {radiusKm} km
          </div>
        </div>

        {/* Map Preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-dark-green)]">
              Map of Chargers in PIN {pincode}
            </h2>
            <Link
              href={routeUrls.map()}
              className="text-xs font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              Full Screen Map →
            </Link>
          </div>

          <div className="h-[340px] sm:h-[400px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={stationList}
              selectedStationId={selectedStation?.id}
              onSelectStation={(s) => setSelectedStation(s)}
            />
          </div>
        </section>

        {/* Nearby Charging Stations List */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Nearby Stations ({stationList.length})
          </h2>

          <StationList
            stations={stationList}
            selectedStationId={selectedStation?.id}
            onSelectStation={(s) => setSelectedStation(s)}
            emptyTitle={`No chargers found within ${radiusKm} km of ${pincode}`}
            emptyDescription="Try increasing the search radius to 50 km or explore the interactive map."
          />
        </section>
      </main>
    </>
  );
}
