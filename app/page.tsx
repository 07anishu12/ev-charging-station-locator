import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { SiteHeader } from "@/components/navigation/site-header";
import { routeUrls } from "@/lib/utils/url";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 sm:py-24">
        <Logo className="mb-8" />
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-secondary-green)]">
          Find your next charging stop.
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--color-dark-green)] sm:text-6xl">
          EV charging discovery, built for India.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted)]">
          FastCharger is laying the foundation for nearby charger search, station details, and directions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={routeUrls.india()}
            className="inline-flex min-h-12 items-center rounded-xl bg-[var(--color-primary)] px-5 font-semibold text-white transition-colors hover:bg-[var(--color-secondary-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Find chargers near me
          </Link>
          <Link
            href={routeUrls.india()}
            className="inline-flex min-h-12 items-center rounded-xl border border-[var(--color-border)] bg-white px-5 font-semibold text-[var(--color-dark-green)] transition-colors hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Browse India
          </Link>
        </div>
      </main>
    </>
  );
}
