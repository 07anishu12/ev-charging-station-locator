import Link from "next/link";

import type { State } from "@fastcharger/shared";
import { routeUrls } from "@/lib/utils/url";

interface StateCardProps {
  state: Pick<State,"id"|"name"|"slug"|"code"|"stationCount"|"cityCount">;
  className?: string;
}

export function StateCard({ state, className = "" }: StateCardProps) {
  return (
    <Link
      href={routeUrls.state(state.slug)}
      className={`group block rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-xs transition-all hover:border-[var(--color-primary)] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[var(--color-light-green)] flex items-center justify-center font-bold text-xs text-[var(--color-secondary-green)]">
            {state.code}
          </span>
          <h3 className="text-base font-semibold tracking-tight text-[var(--color-dark-green)] group-hover:text-[var(--color-primary)] transition-colors">
            {state.name}
          </h3>
        </div>
        <svg
          className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-muted)] pt-2.5 border-t border-[var(--color-border)]">
        <span>{state.stationCount} charging hubs</span>
        <span>{state.cityCount} {state.cityCount === 1 ? "major city" : "major cities"}</span>
      </div>
    </Link>
  );
}
