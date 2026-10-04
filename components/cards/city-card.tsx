import Link from "next/link";

import type { City } from "@fastcharger/shared";
import { routeUrls } from "@/lib/utils/url";

interface CityCardProps {
  city: City;
  className?: string;
}

export function CityCard({ city, className = "" }: CityCardProps) {
  return (
    <Link
      href={routeUrls.city(city.stateSlug, city.slug)}
      className={`group relative overflow-hidden block rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${className}`}
    >
      {/* Top subtle eco accent line on hover */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Very subtle abstract urban skyline silhouette in corner */}
      <svg
        className="absolute -right-2 bottom-0 w-24 h-12 text-emerald-950/[0.03] group-hover:text-[var(--color-primary)]/[0.06] transition-colors pointer-events-none"
        viewBox="0 0 100 40"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M0 40 L0 32 L12 32 L12 20 L24 20 L24 35 L34 35 L34 14 L46 14 L46 28 L58 28 L58 8 L72 8 L72 34 L84 34 L84 22 L100 22 L100 40 Z" />
      </svg>

      <div className="flex items-start justify-between gap-3 mb-2 relative z-10">
        <div>
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <h3 className="text-lg font-bold tracking-tight text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
              {city.name}
            </h3>
          </div>
          <p className="text-xs text-[var(--color-muted)] pl-5">{city.stateName}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[var(--color-light-green)] flex items-center justify-center text-[var(--color-secondary-green)] group-hover:bg-[var(--color-primary)] group-hover:text-white group-hover:scale-105 transition-all duration-200">
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[var(--color-border)] text-xs relative z-10">
        <span className="font-semibold text-[var(--color-dark-green)]">
          {city.stationCount} stations
        </span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className="text-[var(--color-secondary-green)] font-medium inline-flex items-center gap-1">
          <span className="text-[var(--color-primary)]">⚡</span>
          <span>{city.fastChargerCount} Fast DC</span>
        </span>
      </div>
    </Link>
  );
}
