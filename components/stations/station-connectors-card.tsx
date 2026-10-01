import React from "react";
import type { MockConnector } from "@/lib/mock";

interface StationConnectorsCardProps {
  connectors: MockConnector[];
  className?: string;
}

export function StationConnectorsCard({
  connectors,
  className = "",
}: StationConnectorsCardProps) {
  return (
    <section className={`rounded-3xl border border-[var(--color-border)] bg-white p-5 sm:p-6 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-[var(--color-dark-green)]">
          Available Connectors
        </h2>
        <span className="text-xs font-semibold text-[var(--color-muted)]">
          {connectors.length} {connectors.length === 1 ? "Gun" : "Guns"} Total
        </span>
      </div>

      <div className="space-y-3">
        {connectors.map((c) => {
          const isFast = c.powerKw >= 50;
          const typeLabel =
            c.normalizedType === "ccs2"
              ? "CCS2"
              : c.normalizedType === "type2"
              ? "Type 2"
              : c.normalizedType === "chademo"
              ? "CHAdeMO"
              : c.type;

          const categorySubtitle = isFast ? "DC Fast Charging" : "AC Charging";

          return (
            <div
              key={c.id}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-[var(--color-border)] bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-300 transition-all gap-3"
            >
              {/* Left: Plug icon + Details */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Plug diagram icon */}
                <div className="w-12 h-12 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-dark-green)] shadow-2xs shrink-0">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
                    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="14" r="1.5" fill="currentColor" />
                    {c.normalizedType === "ccs2" && (
                      <>
                        <circle cx="10" cy="18" r="1.2" fill="currentColor" />
                        <circle cx="14" cy="18" r="1.2" fill="currentColor" />
                      </>
                    )}
                  </svg>
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-dark-green)]">
                    {typeLabel}
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] font-medium">
                    {categorySubtitle}
                  </p>
                  <p className="text-xs font-bold text-[var(--color-primary)] mt-0.5">
                    {c.powerKw} kW
                  </p>
                </div>
              </div>

              {/* Right: Availability pill badge matching Screen 3 */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 text-emerald-800 px-3 py-1 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-ping" />
                  <span>Available</span>
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-secondary-green)]">
                  {c.quantity} {c.quantity === 1 ? "Gun" : "Guns"} Ready
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
