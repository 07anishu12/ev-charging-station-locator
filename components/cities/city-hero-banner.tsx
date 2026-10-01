"use client";

import { useRouter } from "next/navigation";
import React from "react";

interface CityHeroBannerProps {
  cityName: string;
  citySlug: string;
  stateName: string;
  totalStations: number;
  className?: string;
}

export function CityHeroBanner({
  cityName,
  citySlug,
  stateName,
  totalStations,
  className = "",
}: CityHeroBannerProps) {
  const router = useRouter();

  // Distinct landmark silhouette contours based on city
  const cityLandmarks: Record<string, { label: string; path: string }> = {
    delhi: {
      label: "India Gate & NCR Corridors",
      // India Gate Arch silhouette
      path: "M0 160 L140 160 L140 120 L160 120 L160 50 L180 40 L220 40 L240 50 L240 120 L260 120 L260 160 L400 160",
    },
    mumbai: {
      label: "Gateway of India & Coastal Road",
      path: "M0 160 L130 160 L130 110 L150 110 L150 45 L170 35 L230 35 L250 45 L250 110 L270 110 L270 160 L400 160",
    },
    bengaluru: {
      label: "Tech Corridor & Silicon Plateau",
      path: "M0 160 L120 160 L120 90 L140 90 L140 40 L160 40 L200 20 L240 40 L260 40 L260 90 L280 90 L280 160 L400 160",
    },
  };

  const landmark = cityLandmarks[citySlug] || {
    label: `${stateName} EV Network`,
    path: "M0 160 L130 160 L150 90 L180 90 L200 40 L220 90 L250 90 L270 160 L400 160",
  };

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `EV Charging Stations in ${cityName}`,
          text: `Discover ${totalStations}+ EV charging stations in ${cityName} on FastCharger!`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback
      }
    }

    if (typeof window !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      alert(`Link to ${cityName} EV charging stations copied!`);
    }
  };

  return (
    <div
      className={`relative w-full h-44 sm:h-56 rounded-3xl overflow-hidden bg-gradient-to-r from-[#073b2a] via-[#0f6b45] to-[#10201a] shadow-md flex items-end p-5 select-none ${className}`}
    >
      {/* City Skyline & Landmark Vector Silhouette */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        viewBox="0 0 400 160"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path d={landmark.path} stroke="#16c784" strokeWidth="3" fill="#16c784" fillOpacity="0.1" />
      </svg>

      {/* Floating Top Action Controls */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
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

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share city page"
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[var(--color-dark-green)] shadow-md hover:bg-white active:scale-95 transition-all"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Landmark Badge Pill */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-[var(--color-dark-green)] shadow-xs uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
          {landmark.label}
        </span>
      </div>
    </div>
  );
}
