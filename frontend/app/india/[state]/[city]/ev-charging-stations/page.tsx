import type { Metadata } from "next";
import Link from "next/link";

import { CityCard } from "@/components/cards/city-card";
import { CityHeroBanner } from "@/components/cities/city-hero-banner";
import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { CityStationBrowser } from "@/components/stations/city-station-browser";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFAQSchema,
  JsonLd,
} from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatsCards } from "@/components/ui/stats-cards";
import { notFound } from "next/navigation";
import { apiClient } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

interface CityPageProps {
  params: Promise<{ state: string; city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const cityData = await apiClient.getCity(citySlug, { page: 1, pageSize: 1 });

  if (!cityData) {
    return {
      title: "City Not Found | FastCharger",
      robots: { index: false, follow: false },
    };
  }

  const cityName = cityData.city.name;
  const stateName = cityData.city.stateName || "India";
  const canonicalPath = routeUrls.city(stateSlug, citySlug);

  const title = `EV Charging Stations in ${cityName}, ${stateName} (${cityData.pagination.total} Stations) | FastCharger`;
  const description = `Discover ${cityData.pagination.total} public EV charging stations in ${cityName}, ${stateName}. Find fast DC chargers, connector types (CCS2, Type 2), operators, and GPS directions.`;

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

export default async function CityPage({ params }: CityPageProps) {
  const { state: stateSlug, city: citySlug } = await params;

  const [cityData, allCities] = await Promise.all([
    apiClient.getCity(citySlug, { page: 1, pageSize: 100 }),
    apiClient.getCities({ pageSize: 6 }),
  ]);

  if (!cityData) {
    notFound();
  }

  const cityName = cityData.city.name;
  const stateName = cityData.city.stateName || "India";
  const totalStations = cityData.city.stationCount ?? cityData.pagination.total;
  const stationsInCity = cityData.stations;
  const fastChargersCount = stationsInCity.filter((s) => s.fastestPowerKw >= 50).length;
  const displayFastChargers = cityData.city.fastChargerCount ?? fastChargersCount;

  const nearbyCities = allCities.items
    .filter((c) => c.slug !== cityData.city.slug && c.slug !== citySlug)
    .slice(0, 3);

  const operatorsMap = new Map<string, { name: string; slug: string; stationCount: number }>();
  for (const s of stationsInCity) {
    const existing = operatorsMap.get(s.operator.slug) || {
      name: s.operator.name,
      slug: s.operator.slug,
      stationCount: 0,
    };
    existing.stationCount++;
    operatorsMap.set(s.operator.slug, existing);
  }
  const operators = Array.from(operatorsMap.values());
  const totalOperators = cityData.city.networkCount ?? operators.length;

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: "India", path: routeUrls.india() },
    { name: stateName, path: routeUrls.state(stateSlug) },
    { name: cityName, path: routeUrls.city(stateSlug, citySlug) },
  ]);

  const collectionSchema = buildCollectionPageSchema({
    title: `EV Charging Stations in ${cityName}, ${stateName}`,
    description: `Discover verified public EV charging stations in ${cityName}, ${stateName}.`,
    url: routeUrls.city(stateSlug, citySlug),
    itemCount: totalStations,
  });

  const cityFaqs = [
    {
      question: `How many EV charging stations are in ${cityName}?`,
      answer: `There are currently ${totalStations} public EV charging stations cataloged in ${cityName}, ${stateName}, including fast DC corridors and AC destination chargers.`,
    },
    {
      question: `What are the common charging connectors available in ${cityName}?`,
      answer: `Public EV chargers in ${cityName} widely offer CCS (Type 2) DC fast charging connectors along with Type 2 AC chargers compatible with modern electric four-wheelers.`,
    },
    {
      question: `Which charging networks operate in ${cityName}?`,
      answer: `Major EV charging networks in ${cityName} include ${operators.map((op) => op.name).join(", ")}.`,
    },
  ];

  return (
    <>
      <JsonLd schema={[breadcrumbsSchema, collectionSchema, buildFAQSchema(cityFaqs)]} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: "India", href: routeUrls.india() },
            { label: stateName, href: routeUrls.state(stateSlug) },
            { label: cityName },
          ]}
        />

        {/* City Hero Landmark Banner matching Screen 4 */}
        <CityHeroBanner
          cityName={cityName}
          citySlug={citySlug}
          stateName={stateName}
          totalStations={totalStations}
        />

        {/* City Title & Statistics Header matching Screen 4 */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[var(--color-dark-green)]">
              {cityName}
            </h1>
            <span className="text-base sm:text-xl font-bold text-[var(--color-primary)]">
              {totalStations}+ EV Charging Stations
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-2xl leading-relaxed">
            Discover EV charging stations across {cityName}. Find nearby chargers, check availability and get directions.
          </p>
        </div>

        {/* City Navigation Tabs matching Screen 4 */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2 overflow-x-auto no-scrollbar text-sm font-bold">
          <span className="text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] pb-2 px-3">
            Stations ({totalStations})
          </span>
          <Link
            href={routeUrls.india()}
            className="text-[var(--color-muted)] hover:text-[var(--color-dark-green)] pb-2 px-3 transition-colors"
          >
            Areas
          </Link>
          <Link
            href={routeUrls.search()}
            className="text-[var(--color-muted)] hover:text-[var(--color-dark-green)] pb-2 px-3 transition-colors"
          >
            PIN Codes
          </Link>
          <a
            href="#about-city"
            className="text-[var(--color-muted)] hover:text-[var(--color-dark-green)] pb-2 px-3 transition-colors"
          >
            About
          </a>
        </div>

        {/* Real Network Statistics */}
        <StatsCards
          totalStations={totalStations}
          totalOperators={totalOperators}
          fastChargers={displayFastChargers}
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
              href={routeUrls.map({ lat: cityData.city.latitude, lng: cityData.city.longitude })}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              <span>Open in Live Map</span>
              <span>→</span>
            </Link>
          </div>

          <div className="h-[340px] sm:h-[400px] rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={stationsInCity}
              initialCenter={
                cityData.city.latitude && cityData.city.longitude
                  ? { lat: cityData.city.latitude, lng: cityData.city.longitude }
                  : { lat: 28.6139, lng: 77.209 }
              }
              initialZoom={11}
            />
          </div>
        </section>

        {/* Interactive Station Browser with Pagination */}
        <CityStationBrowser
          initialStations={stationsInCity.slice(0, 20)}
          citySlug={citySlug}
          cityName={cityName}
          totalStations={totalStations}
          pageSize={20}
          initialPage={1}
        />

        {/* Charging Networks in this City */}
        <section id="about-city" className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Charging Networks in {cityName}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {operators.map((op) => (
              <div
                key={op.slug || op.name}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-4 text-center shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-light-green)] text-[var(--color-secondary-green)] mx-auto flex items-center justify-center font-bold text-sm mb-2">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-[var(--color-dark-green)]">{op.name}</h3>
                <span className="text-xs text-[var(--color-muted)]">Verified Operator</span>
              </div>
            ))}
          </div>
        </section>

        {/* Nearby Cities in Region */}
        {nearbyCities.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
              Other Cities in {stateName} & Region
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {nearbyCities.map((c) => (
                <CityCard key={c.id} city={c} />
              ))}
            </div>
          </section>
        )}

        {/* AEO FREQUENTLY ASKED QUESTIONS */}
        <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Frequently Asked Questions about EV Charging in {cityName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cityFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs"
              >
                <h3 className="text-sm font-bold text-[var(--color-dark-green)] mb-2">
                  {faq.question}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
