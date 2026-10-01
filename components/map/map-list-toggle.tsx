"use client";

interface MapListToggleProps {
  view: "map" | "list";
  onChange: (view: "map" | "list") => void;
  className?: string;
}

export function MapListToggle({ view, onChange, className = "" }: MapListToggleProps) {
  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-30 lg:hidden shadow-lg ${className}`}
    >
      <div className="flex items-center rounded-full bg-[var(--color-dark-green)] p-1 text-white border border-white/20 backdrop-blur-md">
        <button
          type="button"
          onClick={() => onChange("list")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all focus-visible:outline-none ${
            view === "list"
              ? "bg-[var(--color-primary)] text-white shadow-xs"
              : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span>List</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("map")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all focus-visible:outline-none ${
            view === "map"
              ? "bg-[var(--color-primary)] text-white shadow-xs"
              : "text-white/80 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>Map</span>
        </button>
      </div>
    </div>
  );
}
