import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

import { CityStoryCard } from "@/components/cards/city-story-card";
import { CompactStationCard } from "@/components/cards/compact-station-card";
import { FeaturedStationCard } from "@/components/cards/featured-station-card";
import { StoryCard, type StoryCardItem } from "@/components/cards/story-card";
import { CleanEnergyStory } from "@/components/home/clean-energy-story";
import { MapDiscoveryPreview } from "@/components/home/map-discovery-preview";
import { WhyFastChargerStory } from "@/components/home/why-fastcharger-story";
import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { buildWebSiteSchema, JsonLd } from "@/components/seo/json-ld";
import { StationCard } from "@/components/stations/station-card";
import { ChargingPulse } from "@/components/ui/charging-pulse";
import { EnergyParticles } from "@/components/ui/energy-particles";
import { EnergyTree } from "@/components/ui/energy-tree";
import { OrganicBackground } from "@/components/ui/organic-background";
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

const chargingStories: StoryCardItem[] = [
  {
    id: "ultra-fast",
    tag: "100kW+ Hyper",
    title: "Ultra-Fast DC Highway Charging",
    description: "Charge from 10% to 80% in ~20 minutes on major intercity corridors.",
    stat: "100–150 kW",
    statLabel: "Peak Acceptance",
    href: "/search?kw=100",
    accent: "emerald",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: "rapid-city",
    tag: "60kW Fast",
    title: "Rapid Urban Hubs & Expressways",
    description: "Reliable fast chargers at malls, restaurants, and highway fuel plazas.",
    stat: "50–60 kW",
    statLabel: "City Power",
    href: "/search?kw=60",
    accent: "teal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "ccs2-standard",
    tag: "Universal CCS2",
    title: "All Indian 4-Wheeler EVs",
    description: "Universal compatibility with Nexon, Punch, Curvv, ZS EV, XUV400 & BYD.",
    stat: "Universal",
    statLabel: "Gun Standard",
    href: "/search?connector=ccs2",
    accent: "blue",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: "operational-verified",
    tag: "Active Only",
    title: "Live Operational Status",
    description: "Stations checked for live power output, functional guns, and zero downtime.",
    stat: "99.2%",
    statLabel: "Live Uptime",
    href: "/search?status=operational",
    accent: "forest",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    id: "destination-ac",
    tag: "Type 2 AC",
    title: "Overnight & Destination Stops",
    description: "Relaxed 7.4kW–22kW charging while you stay at hotels, resorts, or offices.",
    stat: "7.4–22 kW",
    statLabel: "Destination",
    href: "/search?connector=type2",
    accent: "amber",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
      </svg>
    ),
  },
];

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
        {/* =================================================================
            1. HERO SECTION (Surface: Pale Green Gradient to White)
            ================================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#eafbf3]/80 via-white to-[#f8faf9] px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 border-b border-emerald-100/60">
          <OrganicBackground variant="hero" />

          {/* Connected EV Highway Vector Backdrop */}
          <svg
            className="absolute inset-x-0 bottom-0 w-full h-36 text-emerald-500/10 pointer-events-none -z-10"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 100 C 300 40, 600 120, 900 60 C 1050 30, 1150 70, 1200 50"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="6 8"
            />
            <circle cx="300" cy="55" r="4" fill="currentColor" />
            <circle cx="600" cy="100" r="5" fill="currentColor" />
            <circle cx="900" cy="65" r="4" fill="currentColor" />
          </svg>

          <div className="mx-auto max-w-4xl text-center relative z-10">
            {/* Eco Pill */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-xs px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] border border-emerald-200 mb-5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-status-pulse-once" />
              <span>⚡ India’s Fast EV Network</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[var(--color-dark-green)] leading-tight">
              Find your next charging stop.
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-xl text-[var(--color-muted)] max-w-2xl mx-auto leading-relaxed">
              Discover EV charging stations across India. Locate fast chargers, verify connectors, and get instant directions.
            </p>

            {/* Search Box */}
            <div className="mt-8 max-w-xl mx-auto">
              <SearchBar placeholder="Search city, PIN code or charging station" />

              {/* Quick Search Chips */}
              <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap text-xs text-[var(--color-muted)]">
                <span className="font-semibold text-gray-500 mr-1">Quick:</span>
                <Link
                  href="/search?q=delhi"
                  className="px-2.5 py-1 rounded-full bg-white border border-[var(--color-border)] hover:border-emerald-400 hover:text-emerald-700 transition-colors shadow-2xs"
                >
                  Delhi NCR
                </Link>
                <Link
                  href="/search?q=bengaluru"
                  className="px-2.5 py-1 rounded-full bg-white border border-[var(--color-border)] hover:border-emerald-400 hover:text-emerald-700 transition-colors shadow-2xs"
                >
                  Bengaluru
                </Link>
                <Link
                  href="/search?q=mumbai"
                  className="px-2.5 py-1 rounded-full bg-white border border-[var(--color-border)] hover:border-emerald-400 hover:text-emerald-700 transition-colors shadow-2xs"
                >
                  Mumbai
                </Link>
                <Link
                  href="/search?kw=100"
                  className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  ⚡ 100kW+ Fast
                </Link>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-sm sm:text-base text-white shadow-md hover:shadow-lg hover:bg-[var(--color-secondary-green)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
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

        {/* =================================================================
            2. NETWORK METRICS (Surface: Pure White)
            ================================================================= */}
        <section className="px-4 py-8 sm:px-6 mx-auto w-full max-w-7xl">
          <StatsCards
            totalStations={stats.totalStations}
            totalCities={stats.totalCities}
            totalStates={stats.totalStates}
            totalOperators={stats.totalOperators}
          />
        </section>

        {/* =================================================================
            3. CHOOSE YOUR CHARGING STORY STRIP (Surface: Soft Light Background)
            ================================================================= */}
        <section className="py-10 bg-[#f4faf6] border-y border-emerald-100/70 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                  Speed & Compatibility Modes
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-dark-green)] mt-1">
                  Choose Your Charging Experience
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                  Swipe through charging profiles tailored to your EV battery and travel schedule
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--color-muted)] font-medium">
                <span>Swipe to explore</span>
                <span>→</span>
              </div>
            </div>
          </div>

          {/* Horizontal Snap-Scroll Strip */}
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 pt-1">
              {chargingStories.map((story) => (
                <StoryCard key={story.id} item={story} />
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            4. FAST CHARGERS SECTION (Surface: Pure White with Featured Spotlight)
            ================================================================= */}
        <section className="px-4 py-12 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-lg">⚡</span>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--color-dark-green)]">
                  Fast Chargers (60kW+)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                High-power DC rapid chargers ready for highway and corridor stops
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1 group"
            >
              <span>View on map</span>
              <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Featured Spotlight Grid: 1 Hero Card + 3 Compact Companion Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {fastChargers[0] && (
              <div className="lg:col-span-7">
                <FeaturedStationCard station={fastChargers[0]} className="h-full" />
              </div>
            )}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              {fastChargers.slice(1, 4).map((station) => (
                <CompactStationCard key={station.id} station={station} />
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            5. CLEAN ENERGY MANIFESTO (Surface: Pale Green Gradient with Tree)
            ================================================================= */}
        <CleanEnergyStory />

        {/* =================================================================
            6. POPULAR CITIES CAROUSEL (Surface: Pure White)
            ================================================================= */}
        <section className="px-4 py-12 sm:px-6 mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                Metropolitan EV Corridors
              </span>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--color-dark-green)] mt-1">
                Popular Cities
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
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

          {/* City Stories Horizontal Snap Carousel */}
          <div className="flex gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4 pt-1">
            {popularCities.map((city) => (
              <CityStoryCard key={city.id} city={city} />
            ))}
          </div>
        </section>

        {/* =================================================================
            7. RECENTLY UPDATED LIVE FEED (Surface: Soft Neutral Tint)
            ================================================================= */}
        <section className="bg-[#f8faf9] py-12 px-4 sm:px-6 border-y border-[var(--color-border)]">
          <div className="mx-auto w-full max-w-7xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                  Live Verification
                </span>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--color-dark-green)] mt-1">
                  Recently Updated
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                  Verified charging points with updated status and connector availability
                </p>
              </div>
              <Link
                href={routeUrls.map()}
                className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1 group"
              >
                <span>Explore all</span>
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentStations.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            8. INTERACTIVE MAP DISCOVERY PREVIEW (Surface: Emerald Dark Visual)
            ================================================================= */}
        <MapDiscoveryPreview />

        {/* =================================================================
            9. WHY FASTCHARGER STORY (Surface: Pure White Editorial)
            ================================================================= */}
        <WhyFastChargerStory />

        {/* =================================================================
            10. FINAL BOTTOM CTA (Surface: Deep Dark Forest Green #073b2a)
            ================================================================= */}
        <section className="relative overflow-hidden bg-[var(--color-dark-green)] py-20 px-4 sm:px-6 text-white text-center">
          <EnergyParticles count={8} />

          {/* Minimalist Energy Tree Motif in Background Corner */}
          <div className="hidden lg:block absolute right-8 -bottom-6 opacity-25 pointer-events-none">
            <EnergyTree size="md" />
          </div>

          <div className="mx-auto max-w-2xl relative z-10 flex flex-col items-center">
            {/* Live Pulse Badge */}
            <div className="mb-6">
              <ChargingPulse size="sm" theme="dark" label="All-India EV Network" />
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Find a charger near you
            </h2>
            <p className="mt-4 text-sm sm:text-base text-emerald-200/90 max-w-lg leading-relaxed">
              Never experience range anxiety. Explore thousands of verified electric vehicle charging points.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={routeUrls.map({ nearby: true })}
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-7 font-bold text-white shadow-lg hover:bg-emerald-400 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
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
