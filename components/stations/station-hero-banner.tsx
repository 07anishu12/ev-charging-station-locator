"use client";
 
import { useRouter } from "next/navigation";
import React from "react";
import { SavedButton } from "@/components/ui/saved-button";

interface StationHeroBannerProps {
  stationName: string;
  stationSlug: string;
  operatorName: string;
  className?: string;
}

export function StationHeroBanner({
  stationName,
  stationSlug,
  operatorName,
  className = "",
}: StationHeroBannerProps) {
  const router = useRouter();

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
      alert("Station link copied to clipboard!");
    }
  };

  return (
    <div
      className={`relative w-full h-48 sm:h-64 rounded-3xl overflow-hidden bg-gradient-to-r from-[#073b2a] via-[#0f6b45] to-[#073b2a] shadow-md flex items-end p-5 select-none ${className}`}
    >
      {/* Decorative Canopy Hub Vector Art */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
        viewBox="0 0 800 300"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Canopy Structure */}
        <polygon points="100,50 700,50 660,110 140,110" fill="#16c784" opacity="0.3" />
        <line x1="220" y1="110" x2="220" y2="280" stroke="#ffffff" strokeWidth="6" opacity="0.5" />
        <line x1="580" y1="110" x2="580" y2="280" stroke="#ffffff" strokeWidth="6" opacity="0.5" />
        {/* Charging Dispensers */}
        <rect x="260" y="160" width="40" height="110" rx="8" fill="#16c784" opacity="0.6" />
        <rect x="340" y="160" width="40" height="110" rx="8" fill="#16c784" opacity="0.6" />
        <rect x="420" y="160" width="40" height="110" rx="8" fill="#16c784" opacity="0.6" />
        <rect x="500" y="160" width="40" height="110" rx="8" fill="#16c784" opacity="0.6" />
      </svg>

      {/* Floating Top Action Controls matching Screen 3 */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[var(--color-dark-green)] shadow-md hover:bg-white active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Floating Actions: Save & Share */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-white transition-all">
            <SavedButton stationSlug={stationSlug} stationName={stationName} compact />
          </div>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share station"
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[var(--color-dark-green)] shadow-md hover:bg-white active:scale-95 transition-all"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Operator Canopy Brand Pill in Banner */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-xs font-black text-[var(--color-dark-green)] shadow-md tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
          {operatorName} Hub
        </span>
      </div>
    </div>
  );
}
