import Link from "next/link";
import React from "react";

export function MapDiscoveryPreview() {
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-24 border-b border-[var(--color-border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[var(--color-dark-green)] p-6 sm:p-10 lg:p-14 overflow-hidden text-white shadow-xl">
          {/* Subtle Grid & Map Constellation Nodes Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #16c784 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
            aria-hidden="true"
          />

          {/* Abstract Connected EV Routes Network SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
            viewBox="0 0 800 400"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            {/* Trunk highway line */}
            <path
              d="M 100 320 Q 250 180, 420 220 T 720 100"
              stroke="#16c784"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            <path
              d="M 180 80 Q 300 240, 560 160 T 780 340"
              stroke="#34d399"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Pulsing Nodes */}
            <circle cx="250" cy="180" r="6" fill="#16c784" className="animate-pulse" />
            <circle cx="420" cy="220" r="8" fill="#34d399" />
            <circle cx="560" cy="160" r="5" fill="#16c784" />
            <circle cx="720" cy="100" r="7" fill="#10b981" />
          </svg>

          {/* Ambient Lighting Gradients */}
          <div
            className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-800/80 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE GEOGRAPHIC NETWORK</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Explore India&apos;s EV charging network in real-time.
            </h2>

            <p className="mt-4 text-sm sm:text-base text-emerald-100/80 leading-relaxed">
              From city centers to intercity expressways, explore over 400+ verified charging stations with live status, connector compatibility, and exact pincode navigation.
            </p>

            {/* Quick Regional Hotspots */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/search?q=delhi&view=map"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/80 hover:text-white transition-colors"
              >
                Delhi NCR (120+)
              </Link>
              <Link
                href="/search?q=mumbai&view=map"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/80 hover:text-white transition-colors"
              >
                Mumbai Expressways
              </Link>
              <Link
                href="/search?q=bengaluru&view=map"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 hover:bg-emerald-800/80 hover:text-white transition-colors"
              >
                Bengaluru Outer Ring
              </Link>
            </div>

            {/* Big Map CTA button */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/search?view=map"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-98 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Launch Interactive Map
              </Link>

              <Link
                href="/search?view=list"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-5 py-3.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/40 hover:text-white transition-all"
              >
                Browse All Stations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
