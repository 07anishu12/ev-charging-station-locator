"use client";

import { useMemo, useSyncExternalStore } from "react";

interface SavedButtonProps {
  stationSlug: string;
  stationName: string;
  className?: string;
  compact?: boolean;
}

const STORAGE_KEY = "fastcharger_saved_stations";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fastcharger_saved_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fastcharger_saved_updated", callback);
  };
}

function getSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot(): string {
  return "[]";
}

export function getSavedStationSlugs(): string[] {
  try {
    const raw = getSnapshot();
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function SavedButton({
  stationSlug,
  stationName,
  className = "",
  compact = false,
}: SavedButtonProps) {
  const savedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSaved = useMemo(() => {
    try {
      const list: string[] = JSON.parse(savedJson);
      return list.includes(stationSlug);
    } catch {
      return false;
    }
  }, [savedJson, stationSlug]);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const currentList: string[] = JSON.parse(getSnapshot());
      let updated: string[];
      if (currentList.includes(stationSlug)) {
        updated = currentList.filter((s) => s !== stationSlug);
      } else {
        updated = [...currentList, stationSlug];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("fastcharger_saved_updated"));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <button
      type="button"
      onClick={toggleSave}
      aria-label={isSaved ? `Remove ${stationName} from saved` : `Save ${stationName}`}
      title={isSaved ? "Saved" : "Save charger"}
      className={`inline-flex items-center justify-center rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${
        compact
          ? "w-9 h-9 border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white text-[var(--color-dark-green)]"
          : "min-h-11 px-4 gap-2 text-sm font-semibold border border-[var(--color-border)] bg-white hover:bg-[var(--color-light-green)]"
      } ${isSaved ? "text-rose-500 border-rose-200 bg-rose-50/50" : ""} ${className}`}
    >
      <svg
        className="w-4 h-4 shrink-0 transition-transform active:scale-125"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {!compact && <span>{isSaved ? "Saved" : "Save"}</span>}
    </button>
  );
}
