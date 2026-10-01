"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "none";
  energyAccent?: boolean;
}

/**
 * SectionReveal — Ultra-lightweight scroll-entrance container using IntersectionObserver.
 * - Animates once when entering viewport: opacity 0 -> 1, translateY 8px -> 0 (500ms).
 * - Optional subtle energy beam line illuminates left -> right when entering.
 * - Stays visible permanently once revealed.
 * - Immediately visible if JS / IntersectionObserver is not available or if reduced motion is requested.
 */
export function SectionReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  energyAccent = false,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If user prefers reduced motion, show immediately without animation
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: "500ms",
        transitionDelay: `${delayMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`relative transition-all ${
        isVisible
          ? "opacity-100 translate-y-0"
          : direction === "up"
          ? "opacity-0 translate-y-2"
          : "opacity-0"
      } ${className}`}
    >
      {energyAccent && isVisible && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden pointer-events-none z-10"
        >
          <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent animate-energy-beam" />
        </div>
      )}
      {children}
    </div>
  );
}
