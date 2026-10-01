import React from "react";

interface ChargingPulseProps {
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark" | "emerald";
  className?: string;
  label?: string;
}

export function ChargingPulse({
  size = "md",
  theme = "emerald",
  className = "",
  label,
}: ChargingPulseProps) {
  const isDark = theme === "dark";
  const isLight = theme === "light";

  const strokeColor = isDark
    ? "#34d399"
    : isLight
    ? "#ffffff"
    : "var(--color-primary)";

  const textColor = isDark
    ? "text-emerald-300"
    : isLight
    ? "text-white"
    : "text-[var(--color-dark-green)]";

  const pathColor = isDark
    ? "rgba(52, 211, 153, 0.25)"
    : isLight
    ? "rgba(255, 255, 255, 0.3)"
    : "rgba(22, 199, 132, 0.2)";

  const dimensions = {
    sm: { width: 140, height: 28, plugSize: 14, batteryW: 24, batteryH: 14 },
    md: { width: 180, height: 36, plugSize: 18, batteryW: 30, batteryH: 18 },
    lg: { width: 220, height: 44, plugSize: 22, batteryW: 36, batteryH: 22 },
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label={label || "EV charging animation"}
      role="img"
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 180 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* 1. Left EV Plug */}
        <g transform="translate(6, 9)">
          {/* Plug prongs */}
          <line x1="0" y1="4" x2="4" y2="4" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="14" x2="4" y2="4" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          {/* Plug head */}
          <rect x="4" y="1" width="8" height="16" rx="2" fill={strokeColor} />
          {/* Handle */}
          <path d="M12 5 C15 5, 16 7, 18 9 C16 11, 15 13, 12 13 Z" fill={strokeColor} />
        </g>

        {/* 2. Energy Flow Pathway */}
        <path
          d="M 28 18 H 136"
          stroke={pathColor}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 3. Traveling Energy Bolt / Pulse along path */}
        <path
          d="M 28 18 H 136"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="18 90"
          style={{
            animation: "electricity-flow 1.8s linear infinite",
          }}
        />

        {/* Flowing Energy Dot */}
        <circle
          cx="30"
          cy="18"
          r="3"
          fill={strokeColor}
          filter="drop-shadow(0 0 4px rgba(22, 199, 132, 0.8))"
          style={{
            animation: "charging-pulse-dot 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />

        {/* 4. Right Battery Cell */}
        <g transform="translate(140, 9)">
          {/* Battery Body */}
          <rect
            x="0"
            y="1"
            width="28"
            height="16"
            rx="3"
            stroke={strokeColor}
            strokeWidth="2"
            fill="none"
          />
          {/* Positive terminal nipple */}
          <rect x="29" y="5.5" width="2.5" height="7" rx="1" fill={strokeColor} />

          {/* Animated 3 Charge Bars */}
          <rect
            x="3.5"
            y="4"
            width="5.5"
            height="10"
            rx="1"
            fill={strokeColor}
            className="animate-battery-bar-1"
          />
          <rect
            x="11"
            y="4"
            width="5.5"
            height="10"
            rx="1"
            fill={strokeColor}
            className="animate-battery-bar-2"
          />
          <rect
            x="18.5"
            y="4"
            width="5.5"
            height="10"
            rx="1"
            fill={strokeColor}
            className="animate-battery-bar-3"
          />
        </g>
      </svg>

      {label && (
        <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>
          {label}
        </span>
      )}
    </div>
  );
}
