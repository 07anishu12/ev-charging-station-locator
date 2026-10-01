import Link from "next/link";
import React from "react";

export interface StoryCardItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
  href: string;
  accent: "emerald" | "teal" | "amber" | "blue" | "forest";
  icon: React.ReactNode;
}

interface StoryCardProps {
  item: StoryCardItem;
  className?: string;
}

export function StoryCard({ item, className = "" }: StoryCardProps) {
  const accentStyles = {
    emerald: {
      badge: "bg-emerald-100/90 text-emerald-800 border-emerald-200",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      iconBg: "bg-emerald-500 text-white",
      statColor: "text-emerald-700",
      borderHover: "hover:border-emerald-400 group-hover:border-emerald-400",
      barFill: "bg-emerald-500",
    },
    teal: {
      badge: "bg-teal-100/90 text-teal-800 border-teal-200",
      gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
      iconBg: "bg-teal-600 text-white",
      statColor: "text-teal-700",
      borderHover: "hover:border-teal-400 group-hover:border-teal-400",
      barFill: "bg-teal-500",
    },
    amber: {
      badge: "bg-amber-100/90 text-amber-800 border-amber-200",
      gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      iconBg: "bg-amber-500 text-white",
      statColor: "text-amber-700",
      borderHover: "hover:border-amber-400 group-hover:border-amber-400",
      barFill: "bg-amber-500",
    },
    blue: {
      badge: "bg-cyan-100/90 text-cyan-800 border-cyan-200",
      gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
      iconBg: "bg-cyan-600 text-white",
      statColor: "text-cyan-700",
      borderHover: "hover:border-cyan-400 group-hover:border-cyan-400",
      barFill: "bg-cyan-500",
    },
    forest: {
      badge: "bg-emerald-900 text-emerald-100 border-emerald-800",
      gradient: "from-[#073b2a]/15 via-emerald-950/5 to-transparent",
      iconBg: "bg-[#073b2a] text-emerald-300",
      statColor: "text-[#073b2a]",
      borderHover: "hover:border-[#073b2a]/60 group-hover:border-[#073b2a]/60",
      barFill: "bg-[#073b2a]",
    },
  }[item.accent];

  return (
    <Link
      href={item.href}
      className={`group relative snap-start shrink-0 w-[240px] sm:w-[280px] rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden ${accentStyles.borderHover} ${className}`}
    >
      {/* Soft Ambient Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${accentStyles.gradient} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`}
        aria-hidden="true"
      />

      {/* Decorative Corner Glow */}
      <div
        className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-300/20 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"
        aria-hidden="true"
      />

      {/* Header with icon and tag */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110 ${accentStyles.iconBg}`}
          >
            {item.icon}
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${accentStyles.badge}`}
          >
            {item.tag}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight leading-snug group-hover:text-[var(--color-secondary-green)] transition-colors">
          {item.title}
        </h3>
        <p className="mt-1.5 text-xs text-[var(--color-muted)] leading-relaxed line-clamp-2">
          {item.description}
        </p>
      </div>

      {/* Stat Bar & Footer */}
      <div className="relative z-10 mt-6 pt-4 border-t border-[var(--color-border)]/60">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider">
            {item.statLabel}
          </span>
          <span className={`text-base font-black tracking-tight ${accentStyles.statColor}`}>
            {item.stat}
          </span>
        </div>

        {/* Visual progress/power indicator */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${accentStyles.barFill} transition-all duration-500 group-hover:w-full w-4/5`}
          />
        </div>

        {/* Explore link cue */}
        <div className="mt-3 flex items-center justify-end gap-1 text-[11px] font-bold text-[var(--color-secondary-green)] group-hover:translate-x-0.5 transition-transform">
          <span>Find stations</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
