"use client";

interface AnimatedChargingIconProps {
  variant?: "cable-pulse" | "battery-meter" | "compact-plug";
  className?: string;
  size?: number;
}

/**
 * AnimatedChargingIcon — Lightweight SVG visual depicting clean electricity moving.
 * Features:
 * - 'cable-pulse': plug -> energy pulse along curved path -> charging station -> battery (1.8s loop with gentle pause)
 * - 'battery-meter': stylized battery outline with pulsing charge level and mini lightning bolt
 * - 'compact-plug': inline icon with subtle energy pulse
 * GPU accelerated, 100% vector SVG, zero external JS libraries.
 */
export function AnimatedChargingIcon({
  variant = "cable-pulse",
  className = "",
  size = 32,
}: AnimatedChargingIconProps) {
  if (variant === "battery-meter") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 select-none ${className}`}
        aria-hidden="true"
      >
        <svg
          width={size * 1.6}
          height={size}
          viewBox="0 0 48 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Battery Body Outline */}
          <rect
            x="2"
            y="3"
            width="38"
            height="18"
            rx="4"
            stroke="var(--color-secondary-green)"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
          />
          {/* Battery Terminal Pin */}
          <path
            d="M42 8 C43.1 8 44 8.9 44 10 V14 C44 15.1 43.1 16 42 16"
            stroke="var(--color-secondary-green)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Static base charge blocks */}
          <rect x="5.5" y="6" width="6.5" height="12" rx="1.5" fill="var(--color-primary)" />
          <rect x="14" y="6" width="6.5" height="12" rx="1.5" fill="var(--color-primary)" />
          <rect x="22.5" y="6" width="6.5" height="12" rx="1.5" fill="var(--color-primary)" />
          {/* 4th charge block that pulses gently */}
          <rect
            x="31"
            y="6"
            width="6.5"
            height="12"
            rx="1.5"
            fill="var(--color-primary)"
            className="animate-battery-pulse"
          />
        </svg>
      </div>
    );
  }

  if (variant === "compact-plug") {
    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-full h-full text-[var(--color-primary)]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping opacity-75" />
      </div>
    );
  }

  // Primary: "cable-pulse"
  // Plug -> Cable energy pulse -> Hub -> Battery
  return (
    <div
      className={`inline-block select-none ${className}`}
      style={{ width: size * 3.2, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 128 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="cableGrad" x1="16" y1="20" x2="88" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f6b45" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16c784" stopOpacity="0.8" />
          </linearGradient>

          <filter id="glowPulse" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Plug Icon on Left */}
        <g transform="translate(4, 10)">
          <rect x="2" y="5" width="10" height="10" rx="2" fill="#073b2a" />
          <line x1="12" y1="7" x2="16" y2="7" stroke="#073b2a" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="12" y1="13" x2="16" y2="13" stroke="#073b2a" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M2 10 H-2" stroke="#68756f" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 2. Cable Path with subtle curved arc */}
        <path
          d="M20 20 C 35 20, 42 12, 58 12 C 74 12, 80 20, 96 20"
          stroke="url(#cableGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 3. Travelling Energy Pulse: CSS animated dash */}
        <path
          d="M20 20 C 35 20, 42 12, 58 12 C 74 12, 80 20, 96 20"
          stroke="#16c784"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          filter="url(#glowPulse)"
          className="animate-cable-pulse"
        />

        {/* 4. Mini Charging Hub / Battery at Right */}
        <g transform="translate(98, 11)">
          {/* Station box */}
          <rect x="0" y="2" width="18" height="15" rx="3" stroke="#0f6b45" strokeWidth="1.8" fill="#ffffff" />
          {/* Screen with lightning */}
          <path
            d="M9 5 L7.5 9.5 H10.5 L9 13.5"
            stroke="#16c784"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Status glow dot on top */}
          <circle cx="9" cy="0" r="1.6" fill="#16c784" className="animate-pulse" />
        </g>
      </svg>
    </div>
  );
}
