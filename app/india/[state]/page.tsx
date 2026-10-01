import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { StateCard } from "@/components/cards/state-card";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { StationList } from "@/components/stations/station-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatsCards } from "@/components/ui/stats-cards";
import {
  getMockCities,
  getMockStateBySlug,
  getMockStates,
  getMockStationsByState,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface StatePageProps {
  params: Promise<{ state: string }>;
}

export default async function StatePage({ params }: StatePageProps) {
  const { state: stateSlug } = await params;
  const state = getMockStateBySlug(stateSlug);

  // If state not found in pre-configured list, create a sensible fallback representation
  const stateName =
    state?.name ??
    stateSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const citiesInState = getMockCities(stateSlug);
  const stationsInState = getMockStationsByState(stateSlug);
  const otherStates = getMockStates()
    .filter((s) => s.slug !== stateSlug)
    .slice(0, 3);

  const totalStations = state?.stationCount ?? (stationsInState.length > 0 ? stationsInState.length : 45);
  const totalCities = citiesInState.length > 0 ? citiesInState.length : 1;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Breadcrumb & Header */}
        <div>
          <Breadcrumbs
            items={[
              { label: "India", href: routeUrls.india() },
              { label: stateName },
            ]}
            className="mb-4"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                Regional Charging Network
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
                EV Charging Stations in {stateName}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--color-muted)] max-w-2xl">
                Find fast DC chargers, 24/7 public points, and destination stations located across {stateName}.
              </p>
            </div>
            <Link
              href={routeUrls.map({ lat: state?.latitude, lng: state?.longitude })}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-colors shrink-0"
            >
              <span>⚡ View on Map</span>
            </Link>
          </div>
        </div>

        {/* State Statistics */}
        <StatsCards
          totalStations={totalStations}
          totalCities={totalCities}
          totalOperators={6}
          fastChargers={Math.round(totalStations * 0.65)}
        />

        {/* State Charging Map */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                {stateName} Charging Map
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Live distribution of verified charging stops in {stateName}
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              Fullscreen Map →
            </Link>
          </div>

          <div className="h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={stationsInState}
              initialCenter={
                state ? { lat: state.latitude, lng: state.longitude } : { lat: 28.6139, lng: 77.209 }
              }
              initialZoom={state ? 8 : 7}
            />
          </div>
        </section>

        {/* Popular Cities in this State */}
        {citiesInState.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
              Cities in {stateName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {citiesInState.map((city) => (
                <CityCard key={city.id} city={city} />
              ))}
            </div>
          </section>
        )}

        {/* Station List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                Charging Stations in {stateName}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Showing verified fast DC and destination stations
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              All {stateName} stations →
            </Link>
          </div>

          <StationList
            stations={stationsInState}
            emptyTitle={`No stations found in ${stateName}`}
            emptyDescription="Explore other Indian states or find chargers near your current location on the map."
          />
        </section>

        {/* Nearby / Related States */}
        <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Explore Neighboring States
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {otherStates.map((s) => (
              <StateCard key={s.id} state={s} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
