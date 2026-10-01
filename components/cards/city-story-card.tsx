import Link from "next/link";
import React from "react";

import type { MockCity } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

interface CityStoryCardProps {
  city: MockCity;
  className?: string;
  badge?: string;
}

export function CityStoryCard({
  city,
  className = "",
  badge,
}: CityStoryCardProps) {
  // Give cities distinct atmospheric color tones
  const cityAccents: Record<string, { gradient: string; badge: string; skyline: string }> = {
    delhi: {
      gradient: "from-emerald-600/10 via-teal-500/5 to-white",
      badge: "National Capital Region",
      skyline: "M0 50 L10 40 L20 40 L20 28 L32 28 L32 15 L45 15 L45 35 L60 35 L60 22 L75 22 L75 42 L90 42 L100 50 Z",
    },
    mumbai: {
      gradient: "from-cyan-600/10 via-blue-500/5 to-white",
      badge: "Financial Hub",
      skyline: "M0 50 L15 32 L25 32 L35 18 L48 18 L55 26 L68 12 L78 12 L85 28 L100 50 Z",
    },
    bengaluru: {
      gradient: "from-green-600/10 via-emerald-500/5 to-white",
      badge: "EV Tech Capital",
      skyline: "M0 50 L12 36 L24 36 L24 20 L38 20 L48 30 L60 14 L72 14 L82 25 L100 50 Z",
    },
    pune: {
      gradient: "from-amber-600/10 via-emerald-500/5 to-white",
      badge: "Automotive Corridor",
      skyline: "M0 50 L14 38 L28 24 L42 24 L52 35 L65 18 L76 18 L88 32 L100 50 Z",
    },
  };

  const accent = cityAccents[city.slug] || {
    gradient: "from-emerald-500/10 via-teal-500/5 to-white",
    badge: badge || "Major EV Hub",
    skyline: "M0 50 L15 35 L30 22 L45 22 L58 32 L72 18 L85 28 L100 50 Z",
  };

  return (
    <Link
      href={routeUrls.city(city.stateSlug, city.slug)}
      className={`group relative snap-start shrink-0 w-[220px] sm:w-[260px] rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:border-emerald-400 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${accent.gradient} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`}
        aria-hidden="true"
      />

      {/* Abstract City Silhouette in footer background */}
      <svg
        className="absolute -right-3 bottom-0 w-36 h-18 text-emerald-950/[0.04] group-hover:text-emerald-600/[0.08] transition-colors pointer-events-none"
        viewBox="0 0 100 50"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={accent.skyline} />
      </svg>

      {/* Header with City Name and Subtitle */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200">
            {accent.badge}
          </span>
          <span className="w-6 h-6 rounded-full bg-emerald-50 text-[var(--color-secondary-green)] flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-all">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>

        <h3 className="text-xl font-black text-[var(--color-text)] tracking-tight group-hover:text-[var(--color-secondary-green)] transition-colors">
          {city.name}
        </h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5 font-medium">
          {city.stateName}
        </p>
      </div>

      {/* Metrics Footer */}
      <div className="relative z-10 mt-6 pt-4 border-t border-[var(--color-border)]/60">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Stations
            </div>
            <div className="text-lg font-black text-[var(--color-dark-green)]">
              {city.stationCount}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Fast Hubs
            </div>
            <div className="text-lg font-black text-[var(--color-primary)]">
              {city.fastChargerCount}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
