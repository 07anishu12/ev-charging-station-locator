"use client";

import Link from "next/link";
import React from "react";

import { EnergyTree } from "@/components/ui/energy-tree";
import { ChargingPulse } from "@/components/ui/charging-pulse";

export function CleanEnergyStory() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f3fbf6] via-[#eafbf3]/50 to-[#f3fbf6] py-16 sm:py-24 border-y border-emerald-100/80">
      {/* Decorative ambient radial glow */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Visual Energy Tree + Electric Pulse */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative rounded-3xl bg-white/80 backdrop-blur-xs border border-emerald-200/70 p-6 sm:p-8 shadow-sm flex flex-col items-center text-center w-full max-w-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary-green)] mb-1">
                Zero Emission Living
              </span>
              <h3 className="text-xl font-black text-[var(--color-dark-green)] mb-6">
                Powered by Renewable Grid
              </h3>

              {/* Animated Energy Tree */}
              <div className="my-2">
                <EnergyTree size="lg" />
              </div>

              {/* Mini Charging Pulse below tree */}
              <div className="mt-6 pt-4 border-t border-emerald-100 w-full flex justify-center">
                <ChargingPulse size="sm" theme="emerald" label="Clean Kilowatts" />
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Narrative & Impact Numbers */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 mb-4">
              <svg className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: "12s" }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
              <span>CLEAN ENERGY MANIFESTO</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[var(--color-dark-green)] tracking-tight leading-tight">
              Every charge is a vote for cleaner Indian skies.
            </h2>

            <p className="mt-4 text-sm sm:text-base text-[var(--color-muted)] leading-relaxed max-w-2xl">
              Electric mobility is not just about avoiding petrol pumps—it is about restoring the air we breathe in Delhi, Mumbai, and Bengaluru. FastCharger prioritizes solar-integrated hubs, verified open connectors, and reliable fast power to accelerate India&apos;s transition.
            </p>

            {/* Impact Metric Cards Grid */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-xs">
                <div className="text-2xl sm:text-3xl font-black text-[var(--color-primary)]">
                  Provider data
                </div>
                <div className="text-xs font-bold text-[var(--color-dark-green)] mt-1">
                  Verified Fast Hubs
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Across 28+ states
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-xs">
                <div className="text-2xl sm:text-3xl font-black text-[var(--color-dark-green)]">
                  99.2%
                </div>
                <div className="text-xs font-bold text-[var(--color-dark-green)] mt-1">
                  Uptime Verification
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Community monitored
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white border border-emerald-100 p-4 shadow-xs">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                  0g
                </div>
                <div className="text-xs font-bold text-[var(--color-dark-green)] mt-1">
                  Tailpipe Emissions
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  100% Electric
                </div>
              </div>
            </div>

            {/* Bottom Section Link */}
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              <Link
                href="/search?kw=60&status=operational"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-emerald-600 active:scale-98 transition-all"
              >
                Find High-Speed Clean Hubs
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
