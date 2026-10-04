import type { Metadata } from "next";
import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { StateCard } from "@/components/cards/state-card";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { buildBreadcrumbSchema, buildCollectionPageSchema, JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatsCards } from "@/components/ui/stats-cards";
import { CANONICAL_STATES } from "@fastcharger/shared";
import { apiClient } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "EV Charging Stations Across India | FastCharger",
  description:
    "Explore public electric vehicle charging infrastructure across 28 states and union territories in India. Locate verified fast DC chargers, highway corridors, and operator coverage.",
  alternates: {
    canonical: absoluteUrl("/india"),
  },
  openGraph: {
    title: "EV Charging Stations Across India | FastCharger",
    description:
      "Explore public electric vehicle charging infrastructure across 28 states and union territories in India.",
    url: absoluteUrl("/india"),
  },
};

export default async function IndiaPage() {
  const [citiesData, stationsData] = await Promise.all([
    apiClient.getCities({ pageSize: 8 }),
    apiClient.getStations({ pageSize: 8 }),
  ]);

  const allStates = CANONICAL_STATES.map((s) => ({
    id: s.slug,
    name: s.name,
    slug: s.slug,
    code: s.code,
    stationCount: 0,
    cityCount: 0,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
  const popularCities = citiesData.items;
  const sampleStations = stationsData.items;
  const uniqueOperatorsCount = new Set(
    sampleStations.map((s) => s.operator?.slug || s.operator?.id).filter(Boolean),
  ).size;
  const stats = {
    totalStations: stationsData.pagination?.total ?? sampleStations.length,
    totalCities: citiesData.pagination?.total ?? popularCities.length,
    totalStates: allStates.length,
    totalOperators: uniqueOperatorsCount,
  };

  const breadcrumbsSchema = buildBreadcrumbSchema([{ name: "India", path: "/india" }]);
  const collectionSchema = buildCollectionPageSchema({
    title: "EV Charging Infrastructure in India",
    description: "National public EV charging network across Indian states, cities, and corridors.",
    url: "/india",
    itemCount: stats.totalStations,
  });

  return (
    <>
      <JsonLd schema={[breadcrumbsSchema, collectionSchema]} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Breadcrumb & Header */}
        <div>
          <Breadcrumbs items={[{ label: "India" }]} className="mb-4" />
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-dark-green)]">
            EV Charging Across India
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[var(--color-muted)] max-w-3xl">
            Explore public electric vehicle charging infrastructure across 28 states and union territories. Locate highway fast chargers, metropolitan networks, and verified operator points.
          </p>
        </div>

        {/* Network Metrics */}
        <StatsCards
          totalStations={stats.totalStations}
          totalCities={stats.totalCities}
          totalStates={stats.totalStates}
          totalOperators={stats.totalOperators}
        />

        {/* India Charging Map Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
                National Charging Corridor Map
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)]">
                Interactive overview of charging hubs distributed across Indian expressways and metro centers
              </p>
            </div>
            <Link
              href={routeUrls.map()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-colors"
            >
              <span>Full Screen Map</span>
              <span>→</span>
            </Link>
          </div>

          <div className="h-[380px] sm:h-[460px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={sampleStations}
              initialCenter={{ lat: 20.5937, lng: 78.9629 }}
              initialZoom={5}
            />
          </div>
        </section>

        {/* Popular Cities */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
              Popular Charging Cities
            </h2>
            <Link
              href={routeUrls.search()}
              className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              Search all cities →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {popularCities.map((city) => (
              <CityCard key={city.id} city={city} />
            ))}
          </div>
        </section>

        {/* States & Union Territories */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
              States & Union Territories
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)]">
              Select a state to inspect regional charging density, major city clusters, and highway routes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {allStates.map((state) => (
              <StateCard key={state.id} state={state} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
