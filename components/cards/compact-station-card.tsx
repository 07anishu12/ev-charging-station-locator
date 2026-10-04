"use client";

import Link from "next/link";
import React from "react";

import { ConnectorBadge } from "@/components/ui/connector-badge";
import { PowerBadge } from "@/components/ui/power-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Station } from "@fastcharger/shared";
import { routeUrls } from "@/lib/utils/url";

interface CompactStationCardProps {
  station: Station;
  className?: string;
}

export function CompactStationCard({
  station,
  className = "",
}: CompactStationCardProps) {
  return (
    <Link
      href={routeUrls.station(station.slug)}
      className={`group flex items-center justify-between gap-3.5 rounded-2xl border border-[var(--color-border)] bg-white p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0">
          <PowerBadge powerKw={station.fastestPowerKw} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary-green)] truncate">
              {station.operator.name}
            </span>
            <span className="text-[var(--color-muted)] text-xs">•</span>
            <span className="text-xs text-[var(--color-muted)] truncate">
              {station.city.name}
            </span>
          </div>

          <h4 className="text-sm font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-secondary-green)] transition-colors">
            {station.name}
          </h4>

          <div className="flex items-center gap-1.5 mt-1.5">
            {station.connectors.slice(0, 2).map((c) => (
              <ConnectorBadge key={c.id} type={c.type} quantity={c.quantity} />
            ))}
            {station.connectors.length > 2 && (
              <span className="text-[10px] font-medium text-[var(--color-muted)]">
                +{station.connectors.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <StatusBadge status={station.status} size="sm" />
        <span className="w-7 h-7 rounded-full bg-emerald-50 text-[var(--color-secondary-green)] flex items-center justify-center group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
