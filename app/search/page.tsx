"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { SiteHeader } from "@/components/navigation/site-header";
import { SearchBar } from "@/components/search/search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeletons";
import {
  getMockCities,
  getMockOperators,
  searchMockEntities,
  type SearchEntityResult,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

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
        {!query && (
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

        {/* When query is present */}
        {query && (
          <div className="space-y-6 mt-6">
            {results.length === 0 ? (
              <EmptyState
                title="No results found"
                description={`We couldn't find any cities, PIN codes, stations, or operators matching "${query}".`}
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
