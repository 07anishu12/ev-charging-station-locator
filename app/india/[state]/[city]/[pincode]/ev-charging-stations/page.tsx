import type { Metadata } from "next";
import Link from "next/link";

import { MapView } from "@/components/map/map-view";
import { SiteHeader } from "@/components/navigation/site-header";
import { NearbyPincodeChips } from "@/components/stations/nearby-pincode-chips";
import { PincodeStationBrowser } from "@/components/stations/pincode-station-browser";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { routeUrls } from "@/lib/utils/url";
import { getPincodeStationData, resolvePincode } from "@/services/pincodes/pincode-service";

interface PincodePageProps {
  params: Promise<{ state: string; city: string; pincode: string }>;
}

export async function generateMetadata({ params }: PincodePageProps): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, pincode } = await params;

  if (!/^\d{6}$/.test(pincode)) {
    return {
      title: `Invalid PIN Code | FastCharger`,
      description: "Invalid 6-digit Indian PIN code.",
    };
  }

  const loc = await resolvePincode(pincode);
  const cityName =
    loc?.city ??
    citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const stateName =
    loc?.state ??
    stateSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  return {
    title: `EV Charging Stations in ${pincode}, ${cityName}, ${stateName} | FastCharger`,
    description: `Discover public EV charging stations in and near PIN ${pincode}, ${cityName}, ${stateName}. Compare fast charging speeds, nearby PIN codes, verified connector types, and GPS directions.`,
  };
}

export default async function PincodePage({ params }: PincodePageProps) {
  const { state: stateSlug, city: citySlug, pincode } = await params;

  // Validation state: must be 6 digits
  if (!/^\d{6}$/.test(pincode)) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 sm:p-12 text-center space-y-3">
            <span className="text-4xl">⚠️</span>
            <h1 className="text-2xl font-bold text-rose-900">Invalid PIN Code</h1>
            <p className="text-sm text-rose-700 max-w-md mx-auto">
              <strong>{pincode}</strong> is not a valid 6-digit Indian postal code. Indian postal codes
              consist of exactly 6 numeric digits (e.g. 110001, 110059, 560001).
            </p>
            <div className="pt-2">
              <Link
                href={routeUrls.city(stateSlug, citySlug)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all"
              >
                Browse All City Stations
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Fetch initial pincode station data (5km default radius)
  const data = await getPincodeStationData(pincode, {
    radiusKm: 5,
    page: 1,
    limit: 20,
  });

  const cityName =
    data.location.city ||
    citySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const stateName =
    data.location.state ||
    stateSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const hasExactStations = data.exactPincodeCount > 0;
  const mapCenter =
    data.location.latitude && data.location.longitude
      ? { lat: data.location.latitude, lng: data.location.longitude }
      : data.stations[0]
        ? { lat: data.stations[0].latitude, lng: data.stations[0].longitude }
        : { lat: 28.6139, lng: 77.209 };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumb & Header */}
        <div>
          <Breadcrumbs
            items={[
              { label: "India", href: routeUrls.india() },
              { label: stateName, href: routeUrls.state(stateSlug) },
              { label: cityName, href: routeUrls.city(stateSlug, citySlug) },
              { label: `PIN ${pincode}` },
            ]}
            className="mb-4"
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                Local Postal Discovery
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-dark-green)] mt-1">
                {hasExactStations
                  ? `EV Charging Stations in ${pincode}`
                  : `EV Charging Stations Near ${pincode}`}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[var(--color-muted)] max-w-2xl">
                {hasExactStations ? (
                  <>
                    Found <strong className="text-[var(--color-dark-green)]">{data.exactPincodeCount}</strong>{" "}
                    charging stations located directly in PIN {pincode}, plus nearby charging points
                    serving {cityName}, {stateName}.
                  </>
                ) : data.total > 0 ? (
                  <>
                    No charging stations are listed directly in {pincode}. Discovered{" "}
                    <strong className="text-[var(--color-dark-green)]">{data.total}</strong> public
                    chargers within a {data.radiusKm} km radius across {cityName}, {stateName}.
                  </>
                ) : (
                  <>
                    Searching charging stations for PIN {pincode} in {cityName}, {stateName}.
                  </>
                )}
              </p>
            </div>

            <Link
              href={routeUrls.map({
                lat: data.location.latitude ?? undefined,
                lng: data.location.longitude ?? undefined,
                nearby: true,
              })}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-xs hover:bg-[var(--color-secondary-green)] transition-all shrink-0"
            >
              <span>⚡ Find Chargers Near Me</span>
            </Link>
          </div>
        </div>

        {/* Geographically Nearby PINs Chips */}
        {data.nearbyPincodes.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-xs">
            <NearbyPincodeChips
              nearbyPincodes={data.nearbyPincodes}
              stateSlug={stateSlug}
              citySlug={citySlug}
              currentPincode={pincode}
            />
          </div>
        )}

        {/* Map Preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-dark-green)]">
              Map of Charging Locations for PIN {pincode}
            </h2>
            <Link
              href={routeUrls.map({
                lat: data.location.latitude ?? undefined,
                lng: data.location.longitude ?? undefined,
              })}
              className="text-xs font-semibold text-[var(--color-secondary-green)] hover:underline"
            >
              Full Screen Map →
            </Link>
          </div>

          <div className="h-[340px] sm:h-[400px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs">
            <MapView
              stations={data.stations}
              initialCenter={mapCenter}
              initialZoom={12}
            />
          </div>
        </section>

        {/* Interactive Pincode Station Browser */}
        <PincodeStationBrowser
          initialResult={data}
          pincode={pincode}
          cityName={cityName}
          stateName={stateName}
        />
      </main>
    </>
  );
}
