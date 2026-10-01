import Link from "next/link";
import React from "react";
import { routeUrls } from "@/lib/utils/url";

interface QuickActionCardsProps {
  className?: string;
}

export function QuickActionCards({ className = "" }: QuickActionCardsProps) {
  const actions = [
    {
      id: "near-me",
      label: "Near Me",
      description: "Auto-detect location",
      href: routeUrls.map({ nearby: true }),
      badge: "GPS",
      iconBg: "bg-emerald-50 text-[var(--color-primary)] border-emerald-100",
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      ),
    },
    {
      id: "by-city",
      label: "By City",
      description: "Metro EV networks",
      href: routeUrls.india(),
      badge: "India",
      iconBg: "bg-teal-50 text-teal-600 border-teal-100",
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      id: "by-pin",
      label: "By PIN Code",
      description: "6-digit postal search",
      href: "/search",
      badge: "PIN",
      iconBg: "bg-cyan-50 text-cyan-600 border-cyan-100",
      icon: (
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className={`grid grid-cols-3 gap-2.5 sm:gap-4 max-w-xl mx-auto w-full ${className}`}>
      {actions.map((action) => (
        <Link
          key={action.id}
          href={action.href}
          data-testid={`quick-action-${action.id}`}
          className="group relative flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs hover:border-[var(--color-primary)] hover:shadow-md hover:-translate-y-1 active:scale-98 transition-all text-center select-none"
        >
          <div
            className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center border mb-2 transition-transform duration-200 group-hover:scale-110 shadow-2xs ${action.iconBg}`}
          >
            {action.icon}
          </div>
          <span className="text-xs sm:text-sm font-bold text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
            {action.label}
          </span>
          <span className="hidden sm:block text-[11px] text-[var(--color-muted)] mt-0.5">
            {action.description}
          </span>
        </Link>
      ))}
    </div>
  );
}
