"use client";

import React, { useState } from "react";
import { SavedButton } from "@/components/ui/saved-button";

interface StationActionBarProps {
  stationSlug: string;
  stationName: string;
  directionsUrl: string;
  operatorWebsite?: string;
  className?: string;
}

export function StationActionBar({
  stationSlug,
  stationName,
  directionsUrl,
  operatorWebsite,
  className = "",
}: StationActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: stationName,
          text: `Check out ${stationName} on FastCharger!`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof window !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`grid grid-cols-4 gap-2.5 sm:gap-4 max-w-xl ${className}`}>
      {/* 1. Directions - Primary Dominant Green */}
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="station-action-directions"
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[var(--color-primary)] text-white shadow-md hover:bg-emerald-600 active:scale-95 transition-all text-center select-none"
      >
        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="text-xs font-bold">Directions</span>
      </a>

      {/* 2. Share */}
      <button
        type="button"
        onClick={handleShare}
        data-testid="station-action-share"
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-dark-green)] shadow-xs hover:border-[var(--color-primary)] hover:bg-emerald-50/40 active:scale-95 transition-all text-center select-none"
      >
        <svg className="w-5 h-5 mb-1 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="text-xs font-bold">{copied ? "Copied!" : "Share"}</span>
      </button>

      {/* 3. Save */}
      <div className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-dark-green)] shadow-xs hover:border-[var(--color-primary)] hover:bg-emerald-50/40 transition-all text-center">
        <SavedButton stationSlug={stationSlug} stationName={stationName} />
        <span className="text-xs font-bold mt-0.5">Save</span>
      </div>

      {/* 4. Contact / Operator Info */}
      <a
        href={operatorWebsite || directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="station-action-contact"
        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[var(--color-border)] text-[var(--color-dark-green)] shadow-xs hover:border-[var(--color-primary)] hover:bg-emerald-50/40 active:scale-95 transition-all text-center select-none"
      >
        <svg className="w-5 h-5 mb-1 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <span className="text-xs font-bold">Contact</span>
      </a>
    </div>
  );
}
