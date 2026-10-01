"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routeUrls } from "@/lib/utils/url";

export function MobileBottomNav() {
  const pathname = usePathname();

  const items = [
    {
      label: "Explore",
      href: routeUrls.explore(),
      exact: true,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="m3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6"
        />
      ),
    },
    {
      label: "Map",
      href: routeUrls.map(),
      exact: false,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"
        />
      ),
    },
    {
      label: "Search",
      href: routeUrls.search(),
      exact: false,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      ),
    },
    {
      label: "Saved",
      href: routeUrls.saved(),
      exact: false,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      ),
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-md md:hidden safe-area-pb shadow-xs"
    >
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label === "Saved" ? "Saved stations" : item.label}
              data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              className="flex flex-col items-center justify-center min-h-[48px] py-1 select-none focus-visible:outline-none group relative"
            >
              <div
                className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--color-light-green)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-muted)] hover:text-[var(--color-dark-green)]"
                }`}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? "scale-105 text-[var(--color-primary)]" : "group-hover:scale-105"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  {item.icon}
                </svg>
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
