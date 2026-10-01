"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeletons";
import type { FindStationsNearPincodeResult } from "@/lib/geo/pincode-discovery";
import {
  getMockCities,
  getMockOperators,
  isGenericChargingIntent,
  searchMockEntities,
  type SearchEntityResult,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  const cleanQuery = query.trim();
  const isPincode = /^\d{6}$/.test(cleanQuery);

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeData, setPincodeData] = useState<FindStationsNearPincodeResult | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Geographic PIN Search effect
  useEffect(() => {
    if (!isPincode) return;

    let ignore = false;
    const abortController = new AbortController();

    async function loadPincodeStations() {
      setPincodeLoading(true);
      setPincodeError(null);
      setPincodeData(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`, {
          signal: abortController.signal,
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.error?.message || "Search request failed");
        }
        const json = await res.json();
        if (!ignore) {
          if (json.data && json.data.searchType === "pincode") {
            setPincodeData(json.data);
          } else {
            setPincodeData(null);
          }
        }
      } catch (err: unknown) {
        if (!ignore && (err as { name?: string }).name !== "AbortError") {
          setPincodeError((err as Error).message || "Failed to fetch PIN code stations");
        }
      } finally {
        if (!ignore) {
          setPincodeLoading(false);
        }
      }
    }

    void loadPincodeStations();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [cleanQuery, isPincode]);

  const results = useMemo(() => {
    return searchMockEntities(query);
  }, [query]);

  const categorized = useMemo(() => {
    const cities: SearchEntityResult[] = [];
    const stations: SearchEntityResult[] = [];
    const operators: SearchEntityResult[] = [];
    const pincodes: SearchEntityResult[] = [];

    results.forEach((r) => {
      if (r.type === "city") cities.push(r);
      else if (r.type === "station") stations.push(r);
      else if (r.type === "operator") operators.push(r);
      else if (r.type === "pincode") pincodes.push(r);
    });

    return { cities, stations, operators, pincodes };
  }, [results]);

  const popularCities = getMockCities().slice(0, 6);
  const popularOperators = getMockOperators().slice(0, 5);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    if (newQuery) {
      router.replace(`/search?q=${encodeURIComponent(newQuery)}`);
    } else {
      router.replace("/search");
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-dark-green)] mb-2">
            Search EV Chargers
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mb-4">
            Search across Indian cities, 6-digit PIN codes, charging networks, or specific stations.
          </p>
          <SearchBar
            initialQuery={query}
            onSearch={handleQueryChange}
            autoFocus
            placeholder="Search city, PIN code or charging station..."
          />
        </div>

        {/* If no search query, show popular suggestions */}
        {!cleanQuery && (
          <div className="space-y-8 mt-8">
            {/* Popular Cities */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-3">
                Popular Cities
              </h2>
              <div className="flex flex-wrap gap-2">
                {popularCities.map((city) => (
                  <Link
                    key={city.id}
                    href={routeUrls.city(city.stateSlug, city.slug)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)] transition-all shadow-xs"
                  >
                    <span>📍</span>
                    <span>{city.name}</span>
                    <span className="text-[var(--color-muted)] text-xs">({city.stationCount})</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular PIN Codes */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-3">
                Example PIN Codes
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  { pin: "110001", area: "Connaught Place, Delhi", state: "delhi", city: "delhi" },
                  { pin: "110058", area: "Janakpuri, Delhi", state: "delhi", city: "delhi" },
                  { pin: "110059", area: "Uttam Nagar, Delhi", state: "delhi", city: "delhi" },
                  { pin: "560001", area: "Bengaluru GPO", state: "karnataka", city: "bengaluru" },
                  { pin: "400051", area: "Bandra Kurla (BKC), Mumbai", state: "maharashtra", city: "mumbai" },
                  { pin: "122002", area: "DLF Cyber City, Gurugram", state: "haryana", city: "gurugram" },
                ].map((item) => (
                  <Link
                    key={item.pin}
                    href={routeUrls.pincode(item.state, item.city, item.pin)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)] transition-all shadow-xs"
                  >
                    <span>📮</span>
                    <span className="font-bold">{item.pin}</span>
                    <span className="text-[var(--color-muted)] text-xs">· {item.area}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Charging Networks */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-3">
                Charging Networks
              </h2>
              <div className="flex flex-wrap gap-2">
                {popularOperators.map((op) => (
                  <Link
                    key={op.id}
                    href={`/map?operator=${op.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)] transition-all shadow-xs"
                  >
                    <span>⚡</span>
                    <span>{op.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6-DIGIT PIN CODE GEOGRAPHIC SEARCH VIEW */}
        {cleanQuery && isPincode && (
          <div className="space-y-6 mt-6">
            {pincodeLoading && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center space-y-3">
                <div className="inline-block animate-spin text-2xl">⏳</div>
                <h3 className="text-base font-bold text-[var(--color-dark-green)]">
                  Discovering charging stations near PIN {cleanQuery}...
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Calculating physical distances to nearby EV charging hubs
                </p>
              </div>
            )}

            {!pincodeLoading && pincodeData && (
              <>
                {/* PIN Code Summary Header */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📮</span>
                        <h2 className="text-lg sm:text-xl font-bold text-[var(--color-dark-green)]">
                          Charging stations near {pincodeData.pincode}
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
                        {pincodeData.origin.city}, {pincodeData.origin.district || pincodeData.origin.state} · Within {pincodeData.radiusKm} km radius
                      </p>
                    </div>

                    {pincodeData.origin.stateSlug && pincodeData.origin.citySlug && (
                      <div className="flex items-center">
                        <Link
                          href={routeUrls.pincode(
                            pincodeData.origin.stateSlug,
                            pincodeData.origin.citySlug,
                            pincodeData.pincode,
                          )}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-light-green)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-emerald-100 transition-all shadow-2xs"
                        >
                          <span>Full Area Guide & Map →</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 font-semibold">
                      ⚡ {pincodeData.counts.total} chargers available
                    </span>
                    {pincodeData.counts.exact > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700">
                        {pincodeData.counts.exact} exact match in {pincodeData.pincode}
                      </span>
                    )}
                    {pincodeData.counts.nearby > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-purple-700">
                        {pincodeData.counts.nearby} within {pincodeData.radiusKm} km
                      </span>
                    )}
                  </div>
                </div>

                {/* Stations List */}
                {pincodeData.results.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
                      Stations near {pincodeData.pincode} ({pincodeData.results.length})
                    </h3>
                    <div className="space-y-2">
                      {pincodeData.results.map((st, i) => (
                        <div
                          key={st.id}
                          style={{
                            animation: "search-stagger-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
                            animationDelay: `${Math.min(i, 8) * 35}ms`,
                          }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] hover:shadow-xs transition-all gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            <span className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-[var(--color-primary)] shrink-0 text-base">
                              ⚡
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-[var(--color-dark-green)] truncate">
                                  {st.name}
                                </h4>
                                {st.matchType === "exact_pincode" ? (
                                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                    Exact PIN {st.stationPincode || st.pincode}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                    📍 {st.distanceKm} km away {st.stationPincode ? `(PIN ${st.stationPincode})` : ""}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                                  {st.operator.name}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-muted)] mt-1 truncate">
                                {st.address}
                              </p>
                              <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
                                <span className="font-bold text-[var(--color-primary)]">
                                  ⚡ Up to {st.fastestPowerKw}kW
                                </span>
                                <span className="text-[var(--color-muted)]">·</span>
                                <span className="text-[var(--color-muted)]">
                                  {st.connectors.map((c) => c.type).slice(0, 2).join(", ")}
                                </span>
                                <span className="text-[var(--color-muted)]">·</span>
                                <span className="text-emerald-700 font-medium capitalize">
                                  {st.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                            <Link
                              href={`/station/${st.slug}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--color-primary)] px-3.5 text-xs font-bold text-white hover:bg-[var(--color-secondary-green)] transition-all"
                            >
                              Details →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title={
                      pincodeData.origin.hasCoordinates
                        ? `No charging stations found within ${pincodeData.radiusKm} km`
                        : `No charging stations found near PIN ${pincodeData.pincode}`
                    }
                    description={
                      pincodeData.origin.hasCoordinates
                        ? `We couldn't locate any EV chargers within ${pincodeData.radiusKm} km of PIN ${pincodeData.pincode} (${pincodeData.origin.city || "India"}). Browse all chargers in ${pincodeData.origin.city || "the state"} or explore the interactive map.`
                        : `We couldn't find any registered EV charging stations near PIN code ${pincodeData.pincode}. Try searching with a nearby PIN (e.g. 110001, 560001), searching by city name, or exploring the interactive map.`
                    }
                    actionHref={
                      pincodeData.origin.stateSlug && pincodeData.origin.citySlug
                        ? routeUrls.city(pincodeData.origin.stateSlug, pincodeData.origin.citySlug)
                        : "/map"
                    }
                    actionLabel={
                      pincodeData.origin.city
                        ? `Browse ${pincodeData.origin.city} Map`
                        : "Explore Interactive Map"
                    }
                  />
                )}

                {/* Nearby PIN Codes Chips */}
                {pincodeData.nearbyPincodes.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-2.5">
                      Nearby PIN Codes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {pincodeData.nearbyPincodes.map((item) => (
                        <button
                          key={item.pincode}
                          type="button"
                          onClick={() => handleQueryChange(item.pincode)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-dark-green)] hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)] transition-all cursor-pointer shadow-2xs"
                        >
                          <span>📮</span>
                          <span className="font-bold">{item.pincode}</span>
                          <span className="text-[var(--color-muted)] text-[11px]">
                            · {item.distanceKm} km ({item.district || item.city})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!pincodeLoading && pincodeError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-sm font-bold text-rose-900">Search Error</h3>
                <p className="text-xs text-rose-700">{pincodeError}</p>
              </div>
            )}
          </div>
        )}

        {/* GENERAL TEXT SEARCH VIEW (CITIES, OPERATORS, STATIONS, PIN CODES) */}
        {cleanQuery && !isPincode && (
          <div className="space-y-6 mt-6">
            {/* Generic Charging Intent Acknowledgment Banner */}
            {isGenericChargingIntent(cleanQuery) && results.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">⚡</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--color-dark-green)]">
                      Showing featured EV charging hubs & networks across India
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[var(--color-muted)] mt-0.5">
                      Explore top 50kW+ Fast DC hubs, verified operators, and major city charging corridors.
                    </p>
                  </div>
                </div>
                <Link
                  href="/map?nearby=true"
                  className="inline-flex items-center justify-center shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--color-secondary-green)] transition-all shadow-2xs"
                >
                  Find Near Me →
                </Link>
              </div>
            )}

            {results.length === 0 ? (
              <EmptyState
                title="No results found"
                description={`We couldn't find any cities, PIN codes, stations, or operators matching "${query}". Try searching by city name, PIN code, or charging network.`}
                actionHref="/map"
                actionLabel="Explore Interactive Map"
              />
            ) : (
              <>
                {/* Cities Results */}
                {categorized.cities.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-2.5">
                      Cities ({categorized.cities.length})
                    </h2>
                    <div className="space-y-2">
                      {categorized.cities.map((res, i) => (
                        <Link
                          key={i}
                          href={res.href}
                          style={{
                            animation: "search-stagger-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
                            animationDelay: `${Math.min(i, 8) * 35}ms`,
                          }}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3.5 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)]">
                              🏙️
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[var(--color-dark-green)]">
                                {res.title}
                              </h3>
                              <p className="text-xs text-[var(--color-muted)]">{res.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            View Stations →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* PIN Code Results */}
                {categorized.pincodes.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-2.5">
                      PIN Codes ({categorized.pincodes.length})
                    </h2>
                    <div className="space-y-2">
                      {categorized.pincodes.map((res, i) => (
                        <Link
                          key={i}
                          href={res.href}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3.5 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)]">
                              📮
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[var(--color-dark-green)]">
                                PIN {res.title}
                              </h3>
                              <p className="text-xs text-[var(--color-muted)]">{res.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            Nearby Stations →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Charging Stations */}
                {categorized.stations.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-2.5">
                      Charging Stations ({categorized.stations.length})
                    </h2>
                    <div className="space-y-2">
                      {categorized.stations.map((res, i) => (
                        <Link
                          key={i}
                          href={res.href}
                          style={{
                            animation: "search-stagger-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both",
                            animationDelay: `${Math.min(i, 8) * 35}ms`,
                          }}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3.5 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                              ⚡
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[var(--color-dark-green)] truncate">
                                  {res.title}
                                </h3>
                                {res.badge && (
                                  <span className="text-[10px] font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">
                                    {res.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-muted)] truncate">{res.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-primary)] shrink-0 ml-2">
                            Details →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operators */}
                {categorized.operators.length > 0 && (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-2.5">
                      Charging Networks ({categorized.operators.length})
                    </h2>
                    <div className="space-y-2">
                      {categorized.operators.map((res, i) => (
                        <Link
                          key={i}
                          href={res.href}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-3.5 hover:border-[var(--color-primary)] hover:shadow-xs transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[var(--color-secondary-green)]">
                              🔌
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[var(--color-dark-green)]">
                                {res.title}
                              </h3>
                              <p className="text-xs text-[var(--color-muted)]">{res.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            Filter on Map →
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}
