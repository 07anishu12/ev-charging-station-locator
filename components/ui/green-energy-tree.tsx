"use client";

import { useEffect, useRef, useState } from "react";

interface GreenEnergyTreeProps {
  className?: string;
  size?: number | string;
  showEnergyMotif?: boolean;
  variant?: "hero" | "compact" | "minimal";
}

/**
 * GreenEnergyTree — Minimal, stylized sustainability & clean energy motif.
 * Features delicate branches, soft rounded leaves, and subtle electric micro-motifs.
 * Animates once on viewport entry (branches draw, leaves scale 0.94 -> 1),
 * with 1-2 gently swaying leaves (CSS transform, GPU-accelerated, 6-8s period).
 */
export function GreenEnergyTree({
  className = "",
  size = 180,
  showEnergyMotif = true,
  variant = "hero",
}: GreenEnergyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setIsInView(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isMinimal = variant === "minimal";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Subtle eco-gradient */}
          <linearGradient id="treeBranchGrad" x1="80" y1="140" x2="80" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f6b45" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#16c784" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="leafGradPrimary" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16c784" />
            <stop offset="100%" stopColor="#0f6b45" />
          </linearGradient>

          <linearGradient id="leafGradSoft" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eafbf3" />
            <stop offset="100%" stopColor="#a3e9c6" />
          </linearGradient>
        </defs>

        {/* Base ground line — ultra subtle organic root curvature */}
        <path
          d="M48 142 C64 140 96 140 112 142"
          stroke="url(#treeBranchGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Main Trunk & Branches */}
        <g
          className={`transition-all duration-700 ease-out ${
            isInView ? "opacity-100" : "opacity-0"
          }`}
          style={{
            strokeDasharray: 200,
            strokeDashoffset: isInView ? 0 : 200,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out",
          }}
        >
          {/* Central Trunk */}
          <path
            d="M80 140 C80 118 79 92 80 62"
            stroke="url(#treeBranchGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Left Branch Low */}
          <path
            d="M80 108 C72 104 62 102 54 96"
            stroke="url(#treeBranchGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Right Branch Mid */}
          <path
            d="M80 94 C88 88 100 86 108 78"
            stroke="url(#treeBranchGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Left Branch High */}
          <path
            d="M80 78 C73 72 66 66 62 58"
            stroke="url(#treeBranchGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />

          {/* Right Branch High */}
          <path
            d="M80 68 C86 62 92 56 96 50"
            stroke="url(#treeBranchGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>

        {/* Leaves Group — Animates once into place, gentle sway on key leaves */}
        <g
          className={`transition-all duration-500 ease-out ${
            isInView ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: isInView ? "scale(1)" : "scale(0.94)",
            transformOrigin: "80px 80px",
            transition: "transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 200ms, opacity 500ms ease-out 150ms",
          }}
        >
          {/* Top Leaf — Crown */}
          <g className="animate-tree-leaf-sway" style={{ transformOrigin: "80px 60px" }}>
            <path
              d="M80 44 C74 52 74 60 80 62 C86 60 86 52 80 44 Z"
              fill="url(#leafGradPrimary)"
              opacity="0.9"
            />
            {showEnergyMotif && (
              /* Tiny micro lightning in crown leaf */
              <path
                d="M80 50 L78.8 54.5 H81.2 L80 59"
                stroke="#ffffff"
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>

          {/* Left Lower Leaf */}
          <ellipse
            cx="52"
            cy="95"
            rx="9"
            ry="6"
            transform="rotate(-28 52 95)"
            fill="url(#leafGradPrimary)"
            opacity="0.85"
          />

          {/* Left Upper Leaf — Swaying gently */}
          <g className="animate-tree-leaf-sway-slow" style={{ transformOrigin: "60px 56px" }}>
            <path
              d="M58 48 C51 54 53 62 60 62 C67 61 67 53 58 48 Z"
              fill="url(#leafGradSoft)"
              opacity="0.95"
            />
            {/* Small clean energy dot */}
            <circle cx="59.5" cy="55.5" r="1.2" fill="#0f6b45" />
          </g>

          {/* Right Mid Leaf */}
          <ellipse
            cx="110"
            cy="76"
            rx="10"
            ry="6.5"
            transform="rotate(24 110 76)"
            fill="url(#leafGradPrimary)"
            opacity="0.9"
          />
          {showEnergyMotif && (
            <circle cx="110" cy="76" r="1.3" fill="#ffffff" opacity="0.9" />
          )}

          {/* Right Upper Leaf */}
          <path
            d="M98 42 C92 48 94 56 100 56 C106 55 106 47 98 42 Z"
            fill="url(#leafGradSoft)"
            opacity="0.9"
          />

          {/* Center decorative eco-droplets/buds */}
          {!isMinimal && (
            <>
              <circle cx="72" cy="72" r="3.2" fill="#16c784" opacity="0.75" />
              <circle cx="89" cy="85" r="3" fill="#0f6b45" opacity="0.65" />
              <circle cx="68" cy="98" r="2.4" fill="#a3e9c6" opacity="0.8" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
