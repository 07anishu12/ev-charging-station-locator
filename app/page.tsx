import type { Metadata } from "next";
import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { buildWebSiteSchema, JsonLd } from "@/components/seo/json-ld";
import { StationCard } from "@/components/stations/station-card";
import { AnimatedChargingIcon } from "@/components/ui/animated-charging-icon";
import { EnergyParticles } from "@/components/ui/energy-particles";
import { GreenEnergyTree } from "@/components/ui/green-energy-tree";
import { OrganicBackground } from "@/components/ui/organic-background";
import { SectionReveal } from "@/components/ui/section-reveal";
import { StatsCards } from "@/components/ui/stats-cards";
import {
  getMockCities,
  getMockStations,
  getMockStats,
} from "@/lib/mock";
import { absoluteUrl, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
  },
};

export default function HomePage() {
  const stats = getMockStats();
  const allCities = getMockCities();
  const popularCities = allCities.slice(0, 7);
  const fastChargers = getMockStations({ minPowerKw: 60 }).slice(0, 4);
  const recentStations = getMockStations().slice(0, 4);

  return (
    <>
      <JsonLd schema={buildWebSiteSchema()} />
      <SiteHeader />
      <main className="flex-1 flex flex-col">
        {/* Hero Section — Enhanced with subtle eco ecosystem & gentle energy motifs */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[var(--color-light-green)]/70 via-white to-[var(--color-background)] px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <OrganicBackground variant="hero" />

          {/* Environmental Tree Motif — Desktop Accent */}
          <div className="hidden lg:block absolute right-8 xl:right-16 top-12 opacity-70 pointer-events-none">
            <GreenEnergyTree size={150} variant="hero" />
          </div>
          <div className="hidden xl:block absolute left-8 bottom-6 opacity-40 pointer-events-none -scale-x-100">
            <GreenEnergyTree size={110} variant="minimal" />
          </div>

          <div className="mx-auto max-w-4xl text-center relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-xs px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] border border-[var(--color-primary)]/25 mb-4 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-status-pulse-once" />
              <span>⚡ India’s Fast EV Network</span>
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

            {/* CTAs with micro-interaction */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-sm sm:text-base text-white shadow-sm hover:shadow-md hover:bg-[var(--color-secondary-green)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              >
                <span className="transition-transform duration-200 group-hover:scale-110">⚡</span>
                <span>Find Chargers Near Me</span>
              </Link>
              <Link
                href={routeUrls.india()}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-6 font-semibold text-sm sm:text-base text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
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
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1 group"
            >
              <span>All cities</span>
              <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularCities.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        </section>

        {/* Fast Chargers Section — Distinct Eco Backdrop with Pulse */}
        <section className="px-4 py-6 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/25 p-5 sm:p-7 shadow-2xs">
            <OrganicBackground variant="subtle-section" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-lg">⚡</span>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                    Fast Chargers (60kW+)
                  </h2>
                  <AnimatedChargingIcon variant="battery-meter" size={20} className="hidden sm:inline-flex ml-2" />
                </div>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  High-power DC rapid chargers ready for highway and corridor stops
                </p>
              </div>
              <Link
                href={routeUrls.map()}
                className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1"
              >
                <span>View on map</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {fastChargers.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
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
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 transition-transform duration-200 group-hover:scale-110">
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
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 transition-transform duration-200 group-hover:scale-110">
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
                className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] mb-4 transition-transform duration-200 group-hover:scale-110">
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

        {/* Why FastCharger — Visual Storytelling with Staggered Scroll Reveal */}
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
            {/* Card 01 */}
            <SectionReveal delayMs={0}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    01
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Find Nearby Chargers
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Instantly compute distances from your current location with Haversine spatial indexing.
                </p>
              </div>
            </SectionReveal>

            {/* Card 02 */}
            <SectionReveal delayMs={60}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    02
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Search by PIN Code
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Quickly locate charging hubs in any specific 6-digit Indian postal code area.
                </p>
              </div>
            </SectionReveal>

            {/* Card 03 */}
            <SectionReveal delayMs={120}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    03
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Compare Charging Power
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Filter by minimum kW to find fast DC stations capable of rapid highway charging.
                </p>
              </div>
            </SectionReveal>

            {/* Card 04 */}
            <SectionReveal delayMs={180}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    04
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Discover Connector Types
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Know whether a station supports CCS2, Type 2, CHAdeMO, or GB/T before you arrive.
                </p>
              </div>
            </SectionReveal>

            {/* Card 05 */}
            <SectionReveal delayMs={240}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    05
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Get Turn-by-Turn Directions
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  One-tap route launching directly into navigation apps with exact station coordinates.
                </p>
              </div>
            </SectionReveal>

            {/* Card 06 */}
            <SectionReveal delayMs={300}>
              <div className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-md h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] font-bold text-sm transition-transform duration-200 group-hover:scale-110">
                    06
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)] opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
                  Multi-Operator Coverage
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-2 leading-relaxed">
                  Aggregating points across Tata Power, Statiq, Jio-bp, Ather Grid, ChargeZone, and Zeon.
                </p>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* Final CTA — Enhanced with upward subtle energy particles */}
        <section className="relative overflow-hidden bg-[var(--color-dark-green)] py-16 px-4 sm:px-6 text-white text-center">
          <EnergyParticles count={7} />

          {/* Minimalist Tree Silhouette in Background Corner */}
          <div className="hidden md:block absolute -right-4 -bottom-4 opacity-15 pointer-events-none">
            <GreenEnergyTree size={160} variant="minimal" showEnergyMotif={false} />
          </div>

          <div className="mx-auto max-w-2xl relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Find a charger near you
            </h2>
            <p className="mt-3 text-sm sm:text-base text-emerald-200">
              Never experience range anxiety. Explore thousands of verified electric vehicle charging points.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-white shadow-md hover:bg-emerald-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <span className="transition-transform duration-200 group-hover:scale-110">⚡</span>
                <span>Open Interactive Map</span>
              </Link>
              <Link
                href={routeUrls.search()}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 font-semibold text-white hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
