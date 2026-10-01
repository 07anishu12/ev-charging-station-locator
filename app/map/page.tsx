"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { FilterChips, type FilterState } from "@/components/filters/filter-chips";
import { MapListToggle } from "@/components/map/map-list-toggle";
import { MapView, type MapCameraTrigger } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { StationBottomSheet } from "@/components/stations/station-bottom-sheet";
import { StationList } from "@/components/stations/station-list";
import { PageSkeleton } from "@/components/ui/skeletons";
import {
  deriveCanonicalStations,
  NEARBY_DISCOVERY_RADIUS_KM,
  type LocationMode,
} from "@/lib/geo/discovery-state";
import {
  clearCachedUserLocation,
  getCachedUserLocation,
  requestUserLocation,
  type GeolocationStatus,
  type UserLocation,
} from "@/lib/geo/geolocation";
import {
  getMockCities,
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
  const [locationMode, setLocationMode] = useState<LocationMode>(
    initialNearby ? "user" : "none",
  );
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [selectedStation, setSelectedStation] = useState<MockStation | null>(null);

  const cachedLoc = getCachedUserLocation();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    initialLat && initialLng
      ? { lat: initialLat, lng: initialLng }
      : cachedLoc ?? null,
  );

  const isInitialLocating = Boolean(initialNearby && !userLocation && !initialLat && !cachedLoc);
  const [locationStatus, setLocationStatus] = useState<GeolocationStatus>(
    isInitialLocating
      ? "loading"
      : initialNearby && (initialLat || cachedLoc)
      ? "granted"
      : "idle",
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cameraTrigger, setCameraTrigger] = useState<MapCameraTrigger | null>(null);

  // 1. Initial location request if page was loaded with ?nearby=true
  useEffect(() => {
    if (initialNearby && !userLocation) {
      let isMounted = true;

      requestUserLocation().then((res) => {
        if (!isMounted) return;
        if (res.success) {
          setUserLocation(res.location);
          setLocationStatus("granted");
          setLocationError(null);
          setCameraTrigger({
            type: "user",
            lat: res.location.lat,
            lng: res.location.lng,
            zoom: 13,
            timestamp: Date.now(),
          });
        } else {
          setLocationStatus(res.status);
          setLocationError(res.error);
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [initialNearby, userLocation]);

  // 2. Fetch all raw base stations once
  const allRawStations = useMemo(() => getMockStations(), []);

  // 3. Compute ONE canonical filtered station array
  const stations = useMemo(() => {
    return deriveCanonicalStations({
      allStations: allRawStations,
      filters,
      userLocation: locationMode === "user" ? userLocation : null,
      locationMode,
      searchQuery,
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });
  }, [allRawStations, filters, userLocation, locationMode, searchQuery]);

  // 4. Derive active selected station strictly from current canonical results (null if filtered out)
  const activeSelectedStation = useMemo(() => {
    if (!selectedStation) return null;
    return stations.find((s) => s.id === selectedStation.id) ?? null;
  }, [stations, selectedStation]);

  // 5. Handle filter changes with atomic state synchronization
  const handleFiltersChange = async (nextFilters: FilterState) => {
    // A. Check if Nearby was toggled ON
    if (nextFilters.nearby && !filters.nearby) {
      setLocationMode("user");
      setFilters(nextFilters);

      const activeLoc = userLocation || getCachedUserLocation();
      if (activeLoc) {
        setUserLocation(activeLoc);
        setLocationStatus("granted");
        setLocationError(null);
        setCameraTrigger({
          type: "user",
          lat: activeLoc.lat,
          lng: activeLoc.lng,
          zoom: 13,
          timestamp: Date.now(),
        });
        return;
      }

      // Request location from browser
      setLocationStatus("loading");
      setLocationError(null);
      const res = await requestUserLocation();
      if (res.success) {
        setUserLocation(res.location);
        setLocationStatus("granted");
        setLocationError(null);
        setCameraTrigger({
          type: "user",
          lat: res.location.lat,
          lng: res.location.lng,
          zoom: 13,
          timestamp: Date.now(),
        });
      } else {
        setLocationStatus(res.status);
        setLocationError(res.error);
      }
      return;
    }

    // B. Check if Nearby was toggled OFF
    if (!nextFilters.nearby && filters.nearby) {
      setLocationMode("none");
      setFilters(nextFilters);
      return;
    }

    // C. Check if Reset was clicked
    const isReset = Object.keys(nextFilters).length === 0;
    if (isReset) {
      setFilters({});
      setLocationMode("none");
      setSelectedStation(null);
      setLocationError(null);
      // Retain cached user location for future Nearby activations
      return;
    }

    // D. Standard capability filter change (Fast, 100kW+, CCS2, Type 2, Operational)
    setFilters(nextFilters);
  };

  // 6. Handle search query changes
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const q = query.trim().toLowerCase();

    // Check if query corresponds to a recognized city
    const matchedCity = getMockCities().find(
      (c) => c.name.toLowerCase() === q || c.slug === q,
    );
    if (matchedCity) {
      setCameraTrigger({
        type: "city",
        lat: matchedCity.latitude,
        lng: matchedCity.longitude,
        zoom: 12,
        timestamp: Date.now(),
      });
    }
  };

  const isLocating = locationMode === "user" && locationStatus === "loading";

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh] overflow-hidden bg-[var(--color-background)]">
      <SiteHeader />

      {/* Top Search & Filter Bar */}
      <section className="shrink-0 z-20 border-b border-[var(--color-border)] bg-white px-4 py-2.5 sm:px-6">
        <div className="w-full flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SearchBar
              initialQuery={searchQuery}
              onSearch={handleSearchChange}
              placeholder="Filter by station name, address, or operator..."
              className="flex-1"
            />
          </div>
          <FilterChips
            filters={filters}
            onChange={handleFiltersChange}
            isLoadingLocation={isLocating}
          />
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
          {/* Geolocation Error Alert */}
          {locationError && locationMode === "user" && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
              <div className="flex items-center justify-between gap-2">
                <span>{locationError}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearCachedUserLocation();
                    handleFiltersChange({ ...filters, nearby: true });
                  }}
                  className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-[var(--color-dark-green)]">
              {isLocating
                ? "Locating chargers near you..."
                : `${stations.length} ${stations.length === 1 ? "Station found" : "Stations found"}`}
            </span>
            {filters.nearby && locationStatus === "granted" && (
              <span className="text-xs font-semibold text-[var(--color-secondary-green)]">
                Near you (within {NEARBY_DISCOVERY_RADIUS_KM} km)
              </span>
            )}
          </div>

          <div className="pb-24 md:pb-6">
            <StationList
              stations={stations}
              isLoading={isLocating}
              emptyTitle="No charging stations match the selected filters"
              emptyDescription="Try clearing one or more filters or expanding your search."
              selectedStationId={activeSelectedStation?.id}
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
              selectedStationId={activeSelectedStation?.id}
              userLocation={userLocation}
              isNearbyActive={filters.nearby === true && locationStatus === "granted"}
              cameraTrigger={cameraTrigger}
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
            station={activeSelectedStation}
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
