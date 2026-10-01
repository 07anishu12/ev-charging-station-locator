"use client";

import React, { useEffect, useRef, useState } from "react";

interface EnergyTreeProps {
  size?: number | "sm" | "md" | "lg";
  className?: string;
  variant?: "editorial" | "hero" | "minimal";
  interactive?: boolean;
}

export function EnergyTree({
  size = 200,
  className = "",
  variant = "editorial",
}: EnergyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const numericSize =
    typeof size === "number"
      ? size
      : { sm: 120, md: 180, lg: 240 }[size] || 200;

  const opacityClass =
    variant === "minimal"
      ? "opacity-60"
      : variant === "hero"
      ? "opacity-90"
      : "opacity-100";

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center select-none ${opacityClass} ${className}`}
      style={{ width: numericSize, height: numericSize * 1.15 }}
      role="img"
      aria-label="Clean energy tree illustration"
    >
      <svg
        width={numericSize}
        height={numericSize * 1.15}
        viewBox="0 0 200 230"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="trunk-grad" x1="100" y1="210" x2="100" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#073b2a" />
            <stop offset="60%" stopColor="#0f6b45" />
            <stop offset="100%" stopColor="#16c784" />
          </linearGradient>

          <linearGradient id="leaf-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16c784" />
            <stop offset="100%" stopColor="#0f6b45" />
          </linearGradient>

          <linearGradient id="energy-glow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#16c784" stopOpacity="0" />
            <stop offset="50%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a7f3d0" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Ground base root line */}
        <path
          d="M 60 215 C 80 212, 120 212, 140 215"
          stroke="#073b2a"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Main Trunk — Draws in on viewport entry */}
        <path
          d="M 100 215 C 100 170, 98 120, 100 70"
          stroke="url(#trunk-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 160,
            strokeDashoffset: isInView ? 0 : 160,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Primary Branches */}
        {/* Left lower branch */}
        <path
          d="M 99 155 C 80 145, 60 135, 45 125"
          stroke="#0f6b45"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: isInView ? 0 : 80,
            transition: "stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1) 200ms",
          }}
        />

        {/* Right lower branch */}
        <path
          d="M 101 145 C 120 135, 140 125, 155 110"
          stroke="#0f6b45"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: isInView ? 0 : 80,
            transition: "stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1) 300ms",
          }}
        />

        {/* Left upper branch */}
        <path
          d="M 99 110 C 82 95, 68 85, 55 65"
          stroke="#16c784"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{
            strokeDasharray: 70,
            strokeDashoffset: isInView ? 0 : 70,
            transition: "stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1) 450ms",
          }}
        />

        {/* Right upper branch */}
        <path
          d="M 101 100 C 118 85, 132 75, 142 55"
          stroke="#16c784"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{
            strokeDasharray: 70,
            strokeDashoffset: isInView ? 0 : 70,
            transition: "stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1) 500ms",
          }}
        />

        {/* Top crown branch */}
        <path
          d="M 100 70 C 97 50, 98 35, 100 25"
          stroke="#16c784"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: isInView ? 0 : 50,
            transition: "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1) 600ms",
          }}
        />

        {/* One-time Electric Energy Pulse Traveling Up Trunk */}
        {isInView && (
          <circle cx="100" cy="215" r="3.5" fill="#34d399">
            <animateMotion
              path="M 0 0 C 0 -45, -2 -95, 0 -145 C -3 -165, -2 -180, 0 -190"
              begin="700ms"
              dur="1.2s"
              repeatCount="1"
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              values="0; 1; 1; 0"
              keyTimes="0; 0.1; 0.9; 1"
              begin="700ms"
              dur="1.2s"
              fill="freeze"
            />
          </circle>
        )}

        {/* Clean Energy Leaves Group with subtle persistent CSS sway */}
        <g
          className="animate-tree-leaf-sway"
          style={{
            transformOrigin: "100px 100px",
            opacity: isInView ? 1 : 0,
            transition: "opacity 800ms ease 650ms",
          }}
        >
          {/* Top Crown Leaves */}
          <path d="M 100 18 C 94 22, 94 30, 100 35 C 106 30, 106 22, 100 18 Z" fill="url(#leaf-grad)" />
          <path d="M 94 24 C 88 28, 90 35, 96 37 C 98 33, 98 27, 94 24 Z" fill="#34d399" opacity="0.85" />
          <path d="M 106 24 C 112 28, 110 35, 104 37 C 102 33, 102 27, 106 24 Z" fill="#16c784" />

          {/* Left Upper Leaves */}
          <path d="M 52 60 C 44 64, 46 72, 54 74 C 57 69, 58 64, 52 60 Z" fill="url(#leaf-grad)" />
          <path d="M 64 74 C 58 78, 60 85, 68 86 C 70 82, 70 77, 64 74 Z" fill="#34d399" />
          <circle cx="50" cy="58" r="2" fill="#10b981" />

          {/* Right Upper Leaves */}
          <path d="M 145 50 C 153 54, 151 62, 143 64 C 140 59, 139 54, 145 50 Z" fill="url(#leaf-grad)" />
          <path d="M 134 65 C 140 69, 138 76, 130 77 C 128 73, 128 68, 134 65 Z" fill="#16c784" />
          <circle cx="147" cy="48" r="2" fill="#34d399" />

          {/* Left Lower Leaves */}
          <path d="M 42 120 C 33 125, 36 135, 45 137 C 49 131, 50 124, 42 120 Z" fill="url(#leaf-grad)" />
          <path d="M 56 128 C 48 132, 50 140, 58 141 C 61 136, 62 131, 56 128 Z" fill="#16c784" />
          <path d="M 70 138 C 64 142, 66 148, 73 149 C 75 145, 75 141, 70 138 Z" fill="#34d399" opacity="0.9" />

          {/* Right Lower Leaves */}
          <path d="M 158 105 C 167 110, 164 120, 155 122 C 151 116, 150 109, 158 105 Z" fill="url(#leaf-grad)" />
          <path d="M 144 116 C 152 120, 150 128, 142 129 C 139 124, 138 119, 144 116 Z" fill="#16c784" />
          <circle cx="160" cy="103" r="2.5" fill="#34d399" />

          {/* Small electric energy node accents */}
          <circle cx="98" cy="90" r="1.8" fill="#a7f3d0" />
          <circle cx="102" cy="130" r="1.8" fill="#a7f3d0" />
        </g>
      </svg>
    </div>
  );
}
