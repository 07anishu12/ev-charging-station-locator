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
import { StationCard } from "@/components/stations/station-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PowerBadge } from "@/components/ui/power-badge";
import { SavedButton } from "@/components/ui/saved-button";
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-8">
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

        {/* Station Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                {station.operator.name}
              </span>
              <span className="text-[var(--color-border)]">·</span>
              <StatusBadge status={station.status} />
              <PowerBadge powerKw={station.fastestPowerKw} />
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-dark-green)]">
              {station.name}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] flex items-center gap-1.5">
              <span>📍 {station.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SavedButton stationSlug={station.slug} stationName={station.name} />
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>Get Directions</span>
            </a>
          </div>
        </div>

        {/* MAP SECTION */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--color-dark-green)]">Station Location</h2>
            <span className="text-xs text-[var(--color-muted)]">
              GPS: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
            </span>
          </div>

          <div className="h-[280px] sm:h-[360px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={[station]}
              initialCenter={{ lat: station.latitude, lng: station.longitude }}
              initialZoom={15}
            />
          </div>
        </section>

        {/* ADDRESS & ACCESS */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs">
          <h2 className="text-base font-bold text-[var(--color-dark-green)] mb-3">
            Address & Location Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-[var(--color-muted)] block mb-1">Full Address:</span>
              <p className="font-medium text-[var(--color-dark-green)]">{station.address}</p>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block mb-1">Postal Code & Area:</span>
              <p className="font-medium text-[var(--color-dark-green)]">
                PIN {station.pincode}, {station.district}, {station.city.name}
              </p>
            </div>
          </div>
        </section>

        {/* CHARGING CONNECTORS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--color-dark-green)]">
                Available Connectors ({station.connectors.length})
              </h2>
              <p className="text-xs text-[var(--color-muted)]">
                Check port compatibility and maximum output capacity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {station.connectors.map((connector) => (
              <div
                key={connector.id}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-dark-green)]">
                      {connector.type}
                    </h3>
                    <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-semibold">
                      {connector.normalizedType.toUpperCase()}
                    </span>
                  </div>
                  <PowerBadge powerKw={connector.powerKw} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--color-border)] text-xs text-center my-2">
                  <div>
                    <span className="text-[var(--color-muted)] block">Voltage</span>
                    <strong className="text-[var(--color-dark-green)]">
                      {connector.voltage ? `${connector.voltage}V` : "Standard"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block">Current</span>
                    <strong className="text-[var(--color-dark-green)]">
                      {connector.amps ? `${connector.amps}A` : "Auto"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[var(--color-muted)] block">Plugs</span>
                    <strong className="text-[var(--color-dark-green)]">{connector.quantity}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-[var(--color-muted)]">Port Status:</span>
                  <StatusBadge status={connector.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* STATION INFORMATION */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-[var(--color-dark-green)]">Station Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-[var(--color-muted)] block mb-1">Access & Usage:</span>
              <strong className="text-[var(--color-dark-green)]">{station.usageType}</strong>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block mb-1">Data Provider:</span>
              <strong className="text-[var(--color-dark-green)]">{station.dataProvider}</strong>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block mb-1">Last Verified:</span>
              <strong className="text-[var(--color-dark-green)]">{station.lastUpdated}</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-[var(--color-muted)] leading-relaxed">
            <p>
              <strong>Note on Availability:</strong> Operational status is maintained via public station records and community telemetry. It indicates whether the equipment is operational, not real-time parking spot occupancy. Last updated {station.lastUpdated}.
            </p>
          </div>
        </section>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--color-border)]">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all"
          >
            <span>⚡ Open in Google Maps</span>
          </a>
          <Link
            href={routeUrls.map({ lat: station.latitude, lng: station.longitude, nearby: true })}
            className="flex-1 sm:flex-none inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-6 font-semibold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)] transition-all"
          >
            Find Nearby Chargers
          </Link>
        </div>

        {/* NEARBY CHARGERS */}
        {nearbyStations.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-[var(--color-border)]">
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-dark-green)]">
              More Charging Stations Nearby
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nearbyStations.map((s) => (
                <StationCard key={s.id} station={s} />
              ))}
            </div>
          </section>
        )}

        {/* GEO / AI MACHINE-READABLE SPECIFICATIONS */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 sm:p-8 space-y-4">
          <div className="border-b border-[var(--color-border)] pb-3">
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
