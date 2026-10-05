import React from "react";
import Link from "next/link";
import { SectionReveal } from "@/components/ui/section-reveal";

export function WhyFastChargerStory() {
  const operators = [
    "Tata Power EZ Charge",
    "Statiq",
    "Jio-bp pulse",
    "Ather Grid",
    "ChargeZone",
    "Zeon Charging",
  ];

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-24 border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-secondary-green)]">
            Built For Drivers
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--color-dark-green)] mt-2">
            Why FastCharger?
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-muted)] mt-3 leading-relaxed">
            FastCharger simplifies EV mobility with reliable data, transparent connector specs, and turn-by-turn navigation.
          </p>
        </div>

        {/* Editorial Story Layout with Alternating Visual Rhythm */}
        <div className="space-y-6">
          {/* Row 1: Featured Hero Highlight Card (Step 01 & 02 Combo) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 01: Nearby Haversine Spatial Engine */}
            <SectionReveal delayMs={0} className="lg:col-span-7">
              <div className="group relative rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-[var(--color-dark-green)] text-emerald-300 font-black text-sm flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800">
                      Spatial Precision
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Find Nearby Chargers
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    Instantly compute distances from your current location with Haversine spatial indexing. Real-time road distance estimation helps you plan every leg of your journey without anxiety.
                  </p>
                </div>

                {/* Visual Radar Mockup */}
                <div className="relative z-10 mt-6 pt-5 border-t border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-primary)]" />
                    </span>
                    <span className="text-xs font-bold text-[var(--color-dark-green)]">
                      GPS Auto-Centering Active
                    </span>
                  </div>
                  <Link
                    href="/search?view=map&nearby=true"
                    className="text-xs font-bold text-[var(--color-secondary-green)] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Locate now</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </SectionReveal>

            {/* Step 02: Pincode Intelligence */}
            <SectionReveal delayMs={80} className="lg:col-span-5">
              <div className="group relative rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-[var(--color-secondary-green)] font-black text-sm flex items-center justify-center">
                      02
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                      Postal Index
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Search by PIN Code
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    Quickly locate charging hubs in any specific 6-digit Indian postal code area. Search exact and nearby PIN codes using the canonical geographic database.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-mono font-bold text-gray-700">
                    110001
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-mono font-bold text-gray-700">
                    400001
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-mono font-bold text-gray-700">
                    560001
                  </span>
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* Row 2: Steps 03 & 04 (Power filtering & Connectors) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 03: Compare Charging Power */}
            <SectionReveal delayMs={120}>
              <div className="group rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
                      03
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      Speed First
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Compare Charging Power
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    Filter by minimum kW to find fast DC stations capable of rapid highway charging. Instant 50kW, 60kW, 100kW, and 150kW toggles let you match your EV&apos;s peak acceptance rate.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Fast (60kW+)
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Ultra (100kW+)
                  </span>
                </div>
              </div>
            </SectionReveal>

            {/* Step 04: Discover Connector Types */}
            <SectionReveal delayMs={160}>
              <div className="group rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 font-black text-sm flex items-center justify-center">
                      04
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-cyan-50 text-cyan-900 border border-cyan-200">
                      Standardized
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Discover Connector Types
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    Know whether a station supports CCS2, Type 2, CHAdeMO, or GB/T before you arrive. Every gun count and power spec is independently verified.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
                    CCS2 DC
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
                    Type 2 AC
                  </span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
                    CHAdeMO
                  </span>
                </div>
              </div>
            </SectionReveal>
          </div>

          {/* Row 3: Steps 05 & 06 (Turn-by-turn & Multi-operator) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 05: Turn-by-Turn Directions */}
            <SectionReveal delayMs={200}>
              <div className="group rounded-3xl border border-[var(--color-border)] bg-white p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center">
                      05
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                      1-Tap Nav
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Get Turn-by-Turn Directions
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    One-tap route launching directly into navigation apps with exact station coordinates. No lost time circling parking lots or private business gates.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)]/60 flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                    ✓ Google Maps & Apple Maps Deep-Linked
                  </span>
                </div>
              </div>
            </SectionReveal>

            {/* Step 06: Multi-Operator Coverage */}
            <SectionReveal delayMs={240}>
              <div className="group rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-white via-emerald-50/30 to-white p-6 sm:p-8 shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="w-10 h-10 rounded-2xl bg-[var(--color-light-green)] text-[var(--color-secondary-green)] font-black text-sm flex items-center justify-center">
                      06
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800">
                      Unified Ecosystem
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-[var(--color-dark-green)] group-hover:text-[var(--color-secondary-green)] transition-colors">
                    Multi-Operator Coverage
                  </h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    Aggregating points across Tata Power, Statiq, Jio-bp, Ather Grid, ChargeZone, and Zeon. One universal interface instead of ten different proprietary apps.
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-emerald-100 flex flex-wrap gap-1.5">
                  {operators.map((op) => (
                    <span
                      key={op}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-[var(--color-border)] text-gray-700"
                    >
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
