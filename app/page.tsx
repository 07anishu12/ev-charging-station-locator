import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { StationCard } from "@/components/stations/station-card";
import { StatsCards } from "@/components/ui/stats-cards";
import {
  getMockCities,
  getMockStations,
  getMockStats,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

export default function HomePage() {
  const stats = getMockStats();
  const allCities = getMockCities();
  const popularCities = allCities.slice(0, 7);
  const fastChargers = getMockStations({ minPowerKw: 60 }).slice(0, 4);
  const recentStations = getMockStations().slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-light-green)]/60 via-white to-[var(--color-background)] px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-light-green)] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] border border-[var(--color-primary)]/20 mb-4 animate-charging-pulse">
              ⚡ India’s Fast EV Network
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--color-dark-green)] leading-tight">
              Find your next charging stop.
            </h1>
            <p className="mt-4 text-base sm:text-xl text-[var(--color-muted)] max-w-2xl mx-auto">
              Discover EV charging stations across India. Locate fast chargers, verify connectors, and get instant directions.
            </p>

            {/* Search Box */}
            <div className="mt-8 max-w-xl mx-auto">
              <SearchBar placeholder="Search city, PIN code or charging station" />
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-sm sm:text-base text-white shadow-sm hover:bg-[var(--color-secondary-green)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              >
                <span>⚡</span>
                <span>Find Chargers Near Me</span>
              </Link>
              <Link
                href={routeUrls.india()}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-6 font-semibold text-sm sm:text-base text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-gray-50 transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              >
                Explore India
              </Link>
            </div>
          </div>
        </section>

        {/* Network Metrics */}
        <section className="px-4 py-8 sm:px-6 mx-auto w-full max-w-7xl">
          <StatsCards
            totalStations={stats.totalStations}
            totalCities={stats.totalCities}
            totalStates={stats.totalStates}
            totalOperators={stats.totalOperators}
          />
        </section>

        {/* Popular Cities */}
        <section className="px-4 py-8 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                Popular Cities
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Find chargers in major urban charging corridors
              </p>
            </div>
            <Link
              href={routeUrls.india()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1"
            >
              <span>All cities</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularCities.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        </section>

        {/* Fast Chargers Horizontal Mobile Card Rail */}
        <section className="px-4 py-8 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500">⚡</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                  Fast Chargers (60kW+)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                High-power DC rapid chargers ready for highway and corridor stops
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              View on map →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fastChargers.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>

        {/* Recently Updated */}
        <section className="px-4 py-8 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                Recently Updated
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Verified charging points with updated status and connector availability
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              Explore all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentStations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>

        {/* Explore India Section */}
        <section className="bg-white py-12 px-4 sm:px-6 border-y border-[var(--color-border)] my-6">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                Comprehensive Discovery
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
                Explore India’s EV Charging Infrastructure
              </h2>
              <p className="text-sm sm:text-base text-[var(--color-muted)] mt-2">
                Browse state-by-state, inspect city networks, or find charging stops along intercity expressways.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href={routeUrls.india()}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  States & UTs
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                  Explore charging hubs across 28 states and union territories.
                </p>
              </Link>

              <Link
                href={routeUrls.india()}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Major Cities
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                  Metropolitan hubs, fast-charger counts, and local operator coverage.
                </p>
              </Link>

              <Link
                href={routeUrls.map()}
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Interactive Map
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                  Pan, zoom, filter by connector, and preview station details live.
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* Why FastCharger */}
        <section className="px-4 py-12 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              Built For Drivers
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
              Why FastCharger?
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-muted)] mt-2">
              FastCharger simplifies EV mobility with reliable data, transparent connector specs, and turn-by-turn navigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Find Nearby Chargers</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                Instantly compute distances from your current location with Haversine spatial indexing.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Search by PIN Code</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                Quickly locate charging hubs in any specific 6-digit Indian postal code area.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Compare Charging Power</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                Filter by minimum kW to find fast DC stations capable of rapid highway charging.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                04
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Discover Connector Types</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                Know whether a station supports CCS2, Type 2, CHAdeMO, or GB/T before you arrive.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                05
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Get Turn-by-Turn Directions</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                One-tap route launching directly into navigation apps with exact station coordinates.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 font-bold text-sm">
                06
              </div>
              <h3 className="text-base font-bold text-[var(--color-dark-green)]">Multi-Operator Coverage</h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2">
                Aggregating points across Tata Power, Statiq, Jio-bp, Ather Grid, ChargeZone, and Zeon.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[var(--color-dark-green)] py-14 px-4 sm:px-6 text-white text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Find a charger near you
            </h2>
            <p className="mt-3 text-sm sm:text-base text-emerald-200">
              Never experience range anxiety. Explore thousands of verified electric vehicle charging points.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 font-bold text-white shadow-md hover:bg-emerald-400 transition-colors"
              >
                ⚡ Open Interactive Map
              </Link>
              <Link
                href={routeUrls.search()}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Search by City or PIN
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
