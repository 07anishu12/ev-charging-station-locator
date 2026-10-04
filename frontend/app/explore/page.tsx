import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/navigation/site-header";
import { StationCard } from "@/components/stations/station-card";
import { apiClient } from "@/lib/api";
import { routeUrls } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "Explore EV Charging Hubs & Stations in India",
  description:
    "Discover verified fast DC charging stations, high-power EV hubs, and charging networks across India with live connector status and directions.",
};

export default async function ExplorePage() {
  const [stationsData, citiesData] = await Promise.all([
    apiClient.getStations({ pageSize: 12 }),
    apiClient.getCities({ pageSize: 8 }),
  ]);

  const stations = stationsData.items;
  const cities = citiesData.items;
  const operatorsMap = new Map<string, { name: string; slug: string; stationCount: number; website?: string | null }>();
  for (const s of stations) {
    const existing = operatorsMap.get(s.operator.slug) || {
      name: s.operator.name,
      slug: s.operator.slug,
      stationCount: 0,
      website: s.operator.website,
    };
    existing.stationCount++;
    operatorsMap.set(s.operator.slug, existing);
  }
  const operators = Array.from(operatorsMap.values()).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {/* Discovery Hero */}
        <section className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[var(--color-border)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[var(--color-primary)] text-xs font-bold mb-3 border border-emerald-100">
              <span>⚡</span>
              <span>All-India EV Station Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-dark-green)]">
              Explore EV Charging Hubs
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-muted)] mt-2 max-w-2xl">
              Browse high-speed DC charging corridors, verified network operators, and charging
              stations across Indian cities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={routeUrls.map({ nearby: true })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] hover:-translate-y-0.5 transition-all"
            >
              <span>⚡</span>
              <span>Near Me</span>
            </Link>
            <Link
              href={routeUrls.map()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-5 text-sm font-bold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-emerald-50/30 hover:-translate-y-0.5 transition-all"
            >
              <span>🗺️</span>
              <span>Interactive Map</span>
            </Link>
          </div>
        </section>

        {/* Popular Cities */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              Popular Cities
            </h2>
            <Link
              href={routeUrls.india()}
              className="text-xs font-bold text-[var(--color-primary)] hover:underline"
            >
              View All States →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={routeUrls.city(city.stateSlug, city.slug)}
                className="group flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
              >
                <div>
                  <span className="text-xl">🏙️</span>
                  <h3 className="text-sm font-bold text-[var(--color-dark-green)] mt-1.5 group-hover:text-[var(--color-primary)] transition-colors">
                    {city.name}
                  </h3>
                  <p className="text-xs text-[var(--color-muted)]">{city.stateName}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--color-secondary-green)] mt-3">
                  {city.stationCount} stations
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Top Networks */}
        <section className="mb-12">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-4">
            Top Charging Networks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {operators.map((op) => (
              <Link
                key={op.slug}
                href={`/map?operator=${op.slug}`}
                className="group flex flex-col items-center text-center rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[var(--color-primary)] font-black flex items-center justify-center text-sm mb-2 group-hover:scale-105 transition-transform">
                  ⚡
                </div>
                <h3 className="text-xs font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                  {op.name}
                </h3>
                <span className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  {op.stationCount}+ points
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* All Verified Stations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-dark-green)]">
                Verified EV Charging Stations
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Showing all {stations.length} fast DC & AC charging points
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="text-xs font-bold text-[var(--color-primary)] hover:underline"
            >
              Open on Map →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((station) => (
              <StationCard key={station.id} station={station} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
