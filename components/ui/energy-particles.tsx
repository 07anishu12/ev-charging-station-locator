"use client";

interface EnergyParticlesProps {
  count?: number;
  className?: string;
}

/**
 * EnergyParticles — Ultra-lightweight CSS upward energy motes.
 * Uses strictly 6-8 fixed SVG particles with staggered CSS animation delays.
 * Zero JS animation loops, pure GPU opacity & translateY transforms.
 * Pauses automatically when prefers-reduced-motion is active.
 */
export function EnergyParticles({ count = 6, className = "" }: EnergyParticlesProps) {
  // Pre-calculated deterministic positions to avoid SSR hydration mismatch
  const particles = [
    { left: "12%", size: 4, delay: "0s", duration: "3.2s" },
    { left: "28%", size: 3, delay: "1.1s", duration: "2.8s" },
    { left: "45%", size: 5, delay: "0.5s", duration: "3.6s" },
    { left: "62%", size: 3.5, delay: "1.8s", duration: "3.0s" },
    { left: "78%", size: 4.5, delay: "0.8s", duration: "3.4s" },
    { left: "89%", size: 3, delay: "2.2s", duration: "2.6s" },
  ].slice(0, count);

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {particles.map((p, idx) => (
        <span
          key={idx}
          className="absolute bottom-0 rounded-full bg-emerald-300 animate-particle-rise"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            boxShadow: "0 0 6px rgba(52, 211, 153, 0.7)",
          }}
        />
      ))}
    </div>
  );
}
