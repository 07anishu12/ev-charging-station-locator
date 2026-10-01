import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { routeUrls } from "@/lib/utils/url";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href={routeUrls.home()} aria-label="FastCharger home" className="min-h-11 inline-flex items-center">
          <Logo />
        </Link>
        <Link
          href={routeUrls.india()}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[var(--color-secondary-green)] transition-colors hover:bg-[var(--color-light-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          Explore India
        </Link>
      </div>
    </header>
  );
}
