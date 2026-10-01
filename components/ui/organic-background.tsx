"use client";

interface OrganicBackgroundProps {
  className?: string;
  variant?: "hero" | "subtle-section" | "card";
}

/**
 * OrganicBackground — Apple-style minimal environmental & clean energy backdrop.
 * Combines soft organic curves, delicate abstract leaf accents (gentle 6-8s sway),
 * and subtle electrical gradient conduits.
 * Strict zero-overhead: pure SVG, pointer-events-none, hardware-accelerated transforms.
 */
export function OrganicBackground({
  className = "",
  variant = "hero",
}: OrganicBackgroundProps) {
  if (variant === "subtle-section") {
    return (
      <div
        className={`absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 ${className}`}
        aria-hidden="true"
      >
        <svg
          className="absolute w-full h-full opacity-40"
          preserveAspectRatio="none"
          viewBox="0 0 1200 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 240 C 300 180, 500 320, 800 220 C 1000 160, 1100 260, 1200 200 V 400 H 0 Z"
            fill="url(#subtleEcoGrad)"
          />
          <defs>
            <linearGradient id="subtleEcoGrad" x1="0" y1="180" x2="1200" y2="400" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eafbf3" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  // Hero variant: sophisticated, subtle Apple-style eco visual
  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full opacity-65"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft ambient green radial glow */}
          <radialGradient id="heroEcoGlow" cx="50%" cy="30%" r="55%">
            <stop offset="0%" stopColor="#eafbf3" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#eafbf3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Organic curve gradient */}
          <linearGradient id="ecoCurveGrad1" x1="0" y1="200" x2="1440" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#16c784" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#0f6b45" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#16c784" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16c784" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0f6b45" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Ambient Center Glow */}
        <rect width="100%" height="100%" fill="url(#heroEcoGlow)" />

        {/* Gentle organic undulating energy lines */}
        <path
          d="M-40 380 C 260 300, 480 440, 780 340 C 1080 240, 1260 410, 1480 330"
          stroke="url(#ecoCurveGrad1)"
          strokeWidth="2.5"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M-20 460 C 290 390, 520 510, 840 420 C 1120 340, 1300 480, 1500 410"
          stroke="url(#ecoCurveGrad1)"
          strokeWidth="1.8"
          fill="none"
          opacity="0.6"
        />

        {/* Left Peripheral Abstract Leaf Accent (Slow 7s sway) */}
        <g className="animate-leaf-sway-slow" style={{ transformOrigin: "110px 140px" }}>
          <path
            d="M90 110 C 130 90, 170 120, 150 160 C 130 190, 80 170, 90 110 Z"
            fill="url(#leafGrad)"
          />
          {/* Subtle leaf vein */}
          <path
            d="M100 125 Q 125 140, 140 155"
            stroke="#16c784"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.35"
          />
        </g>

        {/* Right Peripheral Abstract Leaf Accent (Slow 8s sway counter) */}
        <g className="animate-leaf-sway-reverse" style={{ transformOrigin: "1340px 180px" }}>
          <path
            d="M1360 140 C 1400 120, 1430 160, 1390 190 C 1350 210, 1320 180, 1360 140 Z"
            fill="url(#leafGrad)"
          />
          <path
            d="M1355 155 Q 1375 170, 1385 185"
            stroke="#0f6b45"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>

        {/* Tiny subtle energy nodes (Clean energy moving motifs) */}
        <circle cx="280" cy="330" r="2.5" fill="#16c784" opacity="0.35" />
        <circle cx="780" cy="340" r="3" fill="#16c784" opacity="0.4" />
        <circle cx="1180" cy="280" r="2" fill="#0f6b45" opacity="0.3" />
      </svg>
    </div>
  );
}
