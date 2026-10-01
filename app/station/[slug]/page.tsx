import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import {
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildStationSchema,
  JsonLd,
} from "@/components/seo/json-ld";
import { StationAboutCard } from "@/components/stations/station-about-card";
import { StationActionBar } from "@/components/stations/station-action-bar";
import { StationCard } from "@/components/stations/station-card";
import { StationConnectorsCard } from "@/components/stations/station-connectors-card";
import { StationHeroBanner } from "@/components/stations/station-hero-banner";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PowerBadge } from "@/components/ui/power-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getMockNearbyStations,
  getMockStationBySlug,
  getMockStations,
} from "@/lib/mock";
import { absoluteUrl } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

interface StationPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const station = getMockStationBySlug(slug) ?? getMockStations()[0];

  if (!station) {
    return {
      title: "Charging Station Not Found | FastCharger",
      description: "Charging station not found.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${station.name} | FastCharger`;
  const description = `${station.name} is a verified ${station.fastestPowerKw}kW EV charging station operated by ${station.operator.name} in ${station.city.name}, ${station.state.name}. View real-time speeds, connector compatibility, and GPS directions.`;
  const canonicalPath = routeUrls.station(station.slug);

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

export default async function StationPage({ params }: StationPageProps) {
  const { slug } = await params;
  const station = getMockStationBySlug(slug) ?? getMockStations()[0];

  if (!station) {
    notFound();
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  const nearbyStations = getMockNearbyStations(station.latitude, station.longitude, 25)
    .filter((s) => s.id !== station.id)
    .slice(0, 3);

  const breadcrumbsSchema = buildBreadcrumbSchema([
    { name: "India", path: routeUrls.india() },
    { name: station.state.name, path: routeUrls.state(station.state.slug) },
    {
      name: station.city.name,
      path: routeUrls.city(station.state.slug, station.city.slug),
    },
    { name: station.name, path: routeUrls.station(station.slug) },
  ]);

  const stationSchema = buildStationSchema(station, routeUrls.station(station.slug));

  const stationFaqs = [
    {
      question: `Where is ${station.name} located?`,
      answer: `${station.name} is located at ${station.address} (${station.city.name}, ${station.state.name}) at GPS coordinates ${station.latitude}, ${station.longitude}.`,
    },
    {
      question: `What is the maximum charging speed at ${station.name}?`,
      answer: `The fastest charging point at this location delivers up to ${station.fastestPowerKw} kW.`,
    },
    {
      question: `Which charging connectors are available at ${station.name}?`,
      answer:
        station.connectors.length > 0
          ? `Available connectors include: ${station.connectors
              .map((c) => `${c.type} (${c.powerKw} kW)`)
              .join(", ")}.`
          : "Standard Indian public charging connectors are supported.",
    },
    {
      question: `Who operates ${station.name} and what is its operational status?`,
      answer: `This station is operated by ${station.operator.name} with listed status "${station.status}".`,
    },
  ];

  return (
    <>
      <JsonLd schema={[breadcrumbsSchema, stationSchema, buildFAQSchema(stationFaqs)]} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: "India", href: routeUrls.india() },
            { label: station.state.name, href: routeUrls.state(station.state.slug) },
            {
              label: station.city.name,
              href: routeUrls.city(station.state.slug, station.city.slug),
            },
            { label: station.name },
          ]}
        />

        {/* Top Canopy Hero Banner matching Screen 3 */}
        <StationHeroBanner
          stationName={station.name}
          stationSlug={station.slug}
          operatorName={station.operator.name}
        />

        {/* Station Title & Status Header matching Screen 3 */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              {station.operator.name}
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span className="text-xs font-semibold text-[var(--color-muted)]">
              ★ 4.8 (Verified Hub)
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-dark-green)]">
            {station.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[var(--color-muted)]">
            <span>📍 {station.address}</span>
            {station.pincode && <span>· PIN {station.pincode}</span>}
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <StatusBadge status={station.status} />
            <PowerBadge powerKw={station.fastestPowerKw} />
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-[var(--color-secondary-green)]">
              <span>🕒 Open 24/7</span>
            </span>
          </div>
        </div>

        {/* 4 Action Buttons Row: Directions, Share, Save, Contact (Screen 3 Reference) */}
        <StationActionBar
          stationSlug={station.slug}
          stationName={station.name}
          directionsUrl={directionsUrl}
          operatorWebsite={station.operator.website}
        />

        {/* Available Connectors Card matching Screen 3 */}
        <StationConnectorsCard connectors={station.connectors} />

        {/* About this Station Metadata Card matching Screen 3 */}
        <StationAboutCard station={station} />

        {/* Location Map Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-dark-green)]">
              Station Location & Map
            </h2>
            <span className="text-xs text-[var(--color-muted)] font-mono">
              GPS: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
            </span>
          </div>

          <div className="h-[280px] sm:h-[360px] rounded-3xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={[station]}
              initialCenter={{ lat: station.latitude, lng: station.longitude }}
              initialZoom={15}
            />
          </div>
        </section>

        {/* Nearby Stations Section */}
        {nearbyStations.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--color-dark-green)]">
                  Nearby Stations in {station.city.name}
                </h2>
                <p className="text-xs text-[var(--color-muted)]">
                  Alternative charging points within 25 km
                </p>
              </div>
              <Link
                href={routeUrls.city(station.state.slug, station.city.slug)}
                className="text-xs sm:text-sm font-semibold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyStations.map((nearby) => (
                <StationCard key={nearby.id} station={nearby} />
              ))}
            </div>
          </section>
        )}

        {/* GEO / AI MACHINE-READABLE SPECIFICATIONS */}
        <section className="rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="border-b border-[var(--color-border)]/60 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
              Authoritative Data Record
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-dark-green)] mt-0.5">
              Machine-Readable Specifications for {station.name}
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Structured parameters formatted for AI agents, generative engines, and EV search discovery.
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5 text-xs sm:text-sm">
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Station Name</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Network / Operator</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.operator.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Operational Status</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Max Charging Speed</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.fastestPowerKw} kW DC</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Connector Standards</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">
                {station.connectors.map((c) => c.type).join(", ") || "Standard Connectors"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Postal Code / PIN</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.pincode || "Cataloged"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">City & State</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.city.name}, {station.state.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">GPS Coordinates</dt>
              <dd className="font-mono text-xs font-bold text-[var(--color-dark-green)] mt-0.5">
                {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--color-muted)]">Telemetry / Update Status</dt>
              <dd className="font-bold text-[var(--color-dark-green)] mt-0.5">{station.lastUpdated}</dd>
            </div>
          </dl>
        </section>

        {/* AEO FREQUENTLY ASKED QUESTIONS */}
        <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-dark-green)]">
            Frequently Asked Questions about {station.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stationFaqs.map((faq, idx) => (
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
