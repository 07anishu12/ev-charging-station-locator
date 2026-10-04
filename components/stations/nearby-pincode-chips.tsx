import Link from "next/link";

import type { NearbyPincodeItem } from "@/lib/api";
import { routeUrls } from "@/lib/utils/url";

interface NearbyPincodeChipsProps {
  nearbyPincodes: NearbyPincodeItem[];
  stateSlug: string;
  citySlug: string;
  currentPincode?: string;
  className?: string;
}

export function NearbyPincodeChips({
  nearbyPincodes,
  stateSlug,
  citySlug,
  currentPincode,
  className = "",
}: NearbyPincodeChipsProps) {
  if (!nearbyPincodes || nearbyPincodes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-[var(--color-dark-green)] flex items-center gap-1.5">
          <span>📍</span>
          <span>Geographically Nearby PIN Codes</span>
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          Sorted by real coordinate distance
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {currentPincode && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)] bg-[var(--color-light-green)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] shadow-2xs">
            <span>🎯 PIN {currentPincode}</span>
            <span className="text-[10px] text-[var(--color-secondary-green)]">(Current)</span>
          </span>
        )}

        {nearbyPincodes.map((item) => (
          <Link
            key={item.pincode}
            href={routeUrls.pincode(stateSlug, citySlug, item.pincode)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-dark-green)] shadow-2xs transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-light-green)]/60 hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <span className="font-bold">PIN {item.pincode}</span>
            {item.distanceKm > 0 && (
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-muted)]">
                {item.distanceKm} km
              </span>
            )}
            {item.district && item.district !== "India" && (
              <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">
                · {item.district}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
