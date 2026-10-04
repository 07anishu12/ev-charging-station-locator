import type { Metadata } from "next";
import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { StateCard } from "@/components/cards/state-card";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFAQSchema,
  JsonLd,
} from "@/components/seo/json-ld";
import { StationList } from "@/components/stations/station-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatsCards } from "@/components/ui/stats-cards";
import { CANONICAL_STATES } from "@fastcharger/shared";
import { apiClient } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

interface StatePageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: StatePageProps): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const canonicalState = CANONICAL_STATES.find((s) => s.slug === stateSlug);
  const stateName =
    canonicalState?.name ??
    stateSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const title = `EV Charging Stations in ${stateName} | FastCharger`;
  const description = `Find verified public EV charging stations across ${stateName}. Compare fast DC chargers, connector types (CCS2, Type 2), operators, and highway routes.`;
  const canonicalPath = routeUrls.state(stateSlug);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(canonicalPath),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonicalPath),
    },
  };
}

export default async function StatePage({ params }: StatePageProps) {
  const { state: stateSlug } = await params;
  const canonicalState = CANONICAL_STATES.find((s) => s.slug === stateSlug);

  const stateName =
    canonicalState?.name ??
    stateSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const [stationsData, citiesData] = await Promise.all([
    apiClient.getStations({ state: stateSlug, pageSize: 20 }),
    apiClient.getCities({ pageSize: 50 }),
  ]);

  const stationsInState = stationsData.items;
  const citiesInState = citiesData.items.filter(
    (c) => c.stateSlug === stateSlug || c.stateName?.toLowerCase() === stateName.toLowerCase(),
  );
  const otherStates = CANONICAL_STATES.filter((s) => s.slug !== stateSlug)
    .slice(0, 3)
    .map((s) => ({
      id: s.slug,
      name: s.name,
      slug: s.slug,
      code: s.code,
      stationCount: 0,
      cityCount: 0,
      latitude: s.latitude,
      longitude: s.longitude,
    }));

  const totalStations = stationsData.pagination?.total ?? stationsInState.length;
  const totalCities = citiesInState.length;

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: "India", path: routeUrls.india() },
    { name: stateName, path: routeUrls.state(stateSlug) },
  ]);

  const collectionSchema = buildCollectionPageSchema({
    title: `EV Charging Stations in ${stateName}`,
    description: `Public electric vehicle charging network across ${stateName}.`,
    url: routeUrls.state(stateSlug),
    itemCount: totalStations,
  });

  const faqs = [
    {
      question: `How many EV charging stations are available in ${stateName}?`,
      answer: `There are approximately ${totalStations} public EV charging stations cataloged across ${stateName}, covering major cities, state highways, and expressways.`,
    },
    {
      question: `Which charging operators operate in ${stateName}?`,
      answer: `Major networks operating in ${stateName} include Tata Power, Statiq, Jio-bp pulse, and other interoperable public networks.`,
    },
    {
      question: `What charging connectors are supported in ${stateName}?`,
      answer: `Stations in ${stateName} primarily support CCS2 for fast DC charging, alongside Type 2 AC connectors for overnight and workplace charging.`,
    },
  ];

  return (
    <>
      <JsonLd schema={[breadcrumbsSchema, collectionSchema, buildFAQSchema(faqs)]} />
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
              href={routeUrls.map({ lat: canonicalState?.latitude, lng: canonicalState?.longitude })}
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
                canonicalState ? { lat: canonicalState.latitude, lng: canonicalState.longitude } : { lat: 28.6139, lng: 77.209 }
              }
              initialZoom={canonicalState ? 8 : 7}
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
            error={stationsData.status === "error" ? stationsData.error.message : null}
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
