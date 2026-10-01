import Link from "next/link";

import type { MockCity } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface CityCardProps {
  city: MockCity;
  className?: string;
}

export function CityCard({ city, className = "" }: CityCardProps) {
  return (
    <Link
      href={routeUrls.city(city.stateSlug, city.slug)}
      className={`group block rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs transition-all hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
            {city.name}
          </h3>
          <p className="text-xs text-[var(--color-muted)]">{city.stateName}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[var(--color-border)] text-xs">
        <span className="font-semibold text-[var(--color-dark-green)]">
          {city.stationCount} stations
        </span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className="text-[var(--color-secondary-green)] font-medium">
          ⚡ {city.fastChargerCount} Fast DC
        </span>
      </div>
    </Link>
  );
}
