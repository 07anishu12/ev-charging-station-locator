"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { FilterChips, type FilterState } from "@/components/filters/filter-chips";
import { MapListToggle } from "@/components/map/map-list-toggle";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { StationBottomSheet } from "@/components/stations/station-bottom-sheet";
import { StationList } from "@/components/stations/station-list";
import { PageSkeleton } from "@/components/ui/skeletons";
import {
  getMockNearbyStations,
  getMockStations,
  type MockStation,
} from "@/lib/mock";

function MapPageContent() {
  const searchParams = useSearchParams();
  const initialLat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
  const initialLng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;
  const initialNearby = searchParams.get("nearby") === "true";
  const initialOperator = searchParams.get("operator") ?? undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    nearby: initialNearby,
    operatorSlug: initialOperator,
  });
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [selectedStation, setSelectedStation] = useState<MockStation | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  );

  // Request user location if nearby is active
  useEffect(() => {
    if (filters.nearby && !userLocation && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback to Delhi center if user denies location
          setUserLocation({ lat: 28.6139, lng: 77.209 });
        },
        { timeout: 8000 },
      );
    }
  }, [filters.nearby, userLocation]);

  // Compute filtered stations
  const stations = useMemo(() => {
    if (filters.nearby && userLocation) {
      const nearbyList = getMockNearbyStations(userLocation.lat, userLocation.lng, 100);
      return nearbyList.filter((s) => {
        if (filters.minPowerKw && s.fastestPowerKw < filters.minPowerKw) return false;
        if (filters.operationalOnly && s.status !== "Operational") return false;
        if (
          filters.connectorType &&
          !s.connectors.some(
            (c) =>
              c.normalizedType === filters.connectorType ||
              c.type.toLowerCase().includes(filters.connectorType!),
          )
        )
          return false;
        if (
          searchQuery &&
          !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !s.address.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      });
    }

    return getMockStations({
      query: searchQuery,
      minPowerKw: filters.minPowerKw,
      connectorType: filters.connectorType,
      operationalOnly: filters.operationalOnly,
      operatorSlug: filters.operatorSlug,
    });
  }, [searchQuery, filters, userLocation]);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh] overflow-hidden bg-[var(--color-background)]">
      <SiteHeader />

      {/* Top Search & Filter Bar */}
      <section className="shrink-0 z-20 border-b border-[var(--color-border)] bg-white px-4 py-2.5 sm:px-6">
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SearchBar
              initialQuery={searchQuery}
              onSearch={setSearchQuery}
              placeholder="Filter by station name, address, or operator..."
              className="flex-1"
            />
          </div>
          <FilterChips filters={filters} onChange={setFilters} />
        </div>
      </section>

      {/* Main Map / List Discovery View */}
      <main className="flex-1 min-h-0 w-full grid grid-cols-1 md:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] lg:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]">
        {/* Left Side: Station List (Desktop or Mobile List Mode) */}
        <section
          className={`h-full min-h-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-background)] p-4 sm:p-5 ${
            mobileView === "list" ? "block" : "hidden md:block"
          }`}
          aria-label="Stations List"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[var(--color-dark-green)]">
              {stations.length} {stations.length === 1 ? "Station found" : "Stations found"}
            </span>
            {filters.nearby && (
              <span className="text-xs font-semibold text-[var(--color-secondary-green)]">
                Sorted by distance
              </span>
            )}
          </div>

          <div className="pb-24 md:pb-6">
            <StationList
              stations={stations}
              selectedStationId={selectedStation?.id}
              onSelectStation={(s) => {
                setSelectedStation(s);
                setMobileView("map");
              }}
            />
          </div>
        </section>

        {/* Right Side: Interactive Map (Desktop or Mobile Map Mode) */}
        <section
          className={`h-full min-h-0 relative overflow-hidden bg-gray-50 ${
            mobileView === "map" ? "block" : "hidden md:block"
          }`}
          aria-label="Interactive Map"
        >
          <div className="absolute inset-0">
            <MapView
              stations={stations}
              selectedStationId={selectedStation?.id}
              onSelectStation={(station) => {
                setSelectedStation(station);
                const card = document.getElementById(`station-card-${station.id}`);
                if (card) {
                  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
              }}
              className="h-full w-full rounded-none border-none"
            />
          </div>

          {/* Mobile Bottom Sheet Preview when station selected */}
          <StationBottomSheet
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
          />
        </section>
      </main>

      {/* Mobile Map / List Toggle */}
      <MapListToggle view={mobileView} onChange={setMobileView} className="md:hidden" />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MapPageContent />
    </Suspense>
  );
}
