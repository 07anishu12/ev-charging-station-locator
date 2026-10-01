"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { routeUrls } from "@/lib/utils/url";

export function SiteHeader() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Explore", href: routeUrls.home() },
    { label: "Map", href: routeUrls.map() },
    { label: "India", href: routeUrls.india() },
    { label: "Search", href: routeUrls.search() },
    { label: "Saved", href: routeUrls.saved() },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href={routeUrls.home()}
            aria-label="FastCharger Home"
            className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
                    isActive
                      ? "text-[var(--color-primary)] bg-[var(--color-light-green)]"
                      : "text-[var(--color-dark-green)] hover:text-[var(--color-primary)] hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          <Link
            href={routeUrls.map({ nearby: true })}
            className="inline-flex min-h-10 sm:min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 sm:px-5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[var(--color-secondary-green)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <span>⚡</span>
            <span className="hidden sm:inline">Find Chargers Near Me</span>
            <span className="sm:hidden">Near Me</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
