import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { StationList } from "@/components/stations/station-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConnectorBadge } from "@/components/ui/connector-badge";
import { StatsCards } from "@/components/ui/stats-cards";
import {
  getMockCities,
  getMockCityBySlug,
  getMockOperators,
  getMockStateBySlug,
  getMockStationsByCity,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface CityPageProps {
  params: Promise<{ state: string; city: string }>;
}

export default async function CityPage({ params }: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;

  const state = getMockStateBySlug(stateSlug);
  const city = getMockCityBySlug(citySlug);

  const stateName =
    state?.name ??
    stateSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const cityName =
    city?.name ??
    citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const stationsInCity = getMockStationsByCity(citySlug);
  const totalStations = city?.stationCount ?? (stationsInCity.length > 0 ? stationsInCity.length : 24);
  const fastChargersCount = city?.fastChargerCount ?? Math.round(totalStations * 0.7);

  const nearbyCities = getMockCities()
    .filter((c) => c.slug !== citySlug)
    .slice(0, 3);

  const operators = getMockOperators().slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Breadcrumb & Header */}
        <div>
          <Breadcrumbs
            items={[
              { label: "India", href: routeUrls.india() },
              { label: stateName, href: routeUrls.state(stateSlug) },
              { label: cityName },
            ]}
            className="mb-4"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                City Charging Network
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
                EV Charging Stations in {cityName}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--color-muted)] max-w-2xl">
                Explore {totalStations} public charging stations in {cityName}, {stateName}. Compare fast DC charging speeds, verify connector compatibility, and get instant GPS directions.
              </p>
            </div>
            <Link
              href={routeUrls.map({
                lat: city?.latitude,
                lng: city?.longitude,
                nearby: true,
              })}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-sm sm:text-base text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all shrink-0"
            >
              <span>⚡ Find Chargers Near Me</span>
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <StatsCards
          totalStations={totalStations}
          totalOperators={operators.length}
          fastChargers={fastChargersCount}
        />

        {/* Map Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                {cityName} Charging Locations
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Select a marker to preview speeds, connectors, and directions
              </p>
            </div>
            <Link
              href={routeUrls.map({ lat: city?.latitude, lng: city?.longitude })}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              <span>Open in Live Map</span>
              <span>→</span>
            </Link>
          </div>

          <div className="h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={stationsInCity}
              initialCenter={
                city ? { lat: city.latitude, lng: city.longitude } : { lat: 28.6139, lng: 77.209 }
              }
              initialZoom={11}
            />
          </div>
        </section>

        {/* Stations List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
              Charging Stations in {cityName}
            </h2>
            <span className="text-xs sm:text-sm text-[var(--color-muted)]">
              {stationsInCity.length} verified hubs
            </span>
          </div>

          <StationList
            stations={stationsInCity}
            emptyTitle={`No stations cataloged yet in ${cityName}`}
            emptyDescription="Explore chargers in nearby areas or search a specific PIN code."
          />
        </section>

        {/* Charging Networks in this City */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Charging Networks in {cityName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {operators.map((op) => (
              <div
                key={op.id}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-4 text-center shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] text-[var(--color-secondary-green)] mx-auto flex items-center justify-center font-bold text-sm mb-2">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-[var(--color-dark-green)]">{op.name}</h3>
                <p className="text-xs text-[var(--color-muted)] mt-1">{op.stationCount}+ points</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Connector Types */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Popular Connectors in {cityName}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            <ConnectorBadge type="CCS (Type 2) DC Fast" />
            <ConnectorBadge type="Type 2 AC (7.4kW - 22kW)" />
            <ConnectorBadge type="CHAdeMO DC" />
            <ConnectorBadge type="GB/T DC" />
            <ConnectorBadge type="16A 3-Pin Socket" />
          </div>
        </section>

        {/* Nearby Cities */}
        <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Nearby Cities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {nearbyCities.map((nc) => (
              <CityCard key={nc.id} city={nc} />
            ))}
          </div>
        </section>

        {/* Concise Informational Section */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 sm:p-8 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--color-dark-green)]">
            Charging Guide for {cityName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
            <div>
              <h3 className="font-semibold text-[var(--color-dark-green)] mb-1">⚡ Fast Charging Corridor</h3>
              <p>Most rapid 60kW and 120kW DC stations are situated along ring roads, highway bypasses, and tech parks.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-dark-green)] mb-1">🕒 Peak Hours</h3>
              <p>Commercial mall hubs experience higher occupancy between 5:00 PM and 9:00 PM on weekends. Check operational status before departure.</p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-dark-green)] mb-1">💳 Payment & Access</h3>
              <p>Public stations support app-based start/stop and UPI payments across major networks including Tata Power, Statiq, and Jio-bp pulse.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
