"use client";

import { useMemo, useSyncExternalStore } from "react";

import { SiteHeader } from "@/components/navigation/site-header";
import { StationList } from "@/components/stations/station-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getMockStationBySlug, type MockStation } from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

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

export default function SavedPage() {
  const savedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const savedStations = useMemo(() => {
    try {
      const slugs: string[] = JSON.parse(savedJson);
      return slugs
        .map((slug) => getMockStationBySlug(slug))
        .filter((s): s is MockStation => s !== null);
    } catch {
      return [];
    }
  }, [savedJson]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-dark-green)]">
              Saved Chargers
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
              Quick access to your favorite and frequently visited charging points.
            </p>
          </div>
          {savedStations.length > 0 && (
            <span className="rounded-full bg-[var(--color-light-green)] px-3 py-1 text-xs font-bold text-[var(--color-secondary-green)]">
              {savedStations.length} saved
            </span>
          )}
        </div>

        {savedStations.length === 0 ? (
          <EmptyState
            title="No saved chargers yet."
            description="Save your regular charging stops to quickly check their status, connectors, and get instant directions. Tap the bookmark icon on any station card or details page to add it here."
            actionHref={routeUrls.map()}
            actionLabel="Explore charging stations"
          />
        ) : (
          <StationList
            stations={savedStations}
            emptyTitle="No saved chargers yet."
            emptyDescription="Explore charging stations"
          />
        )}
      </main>
    </>
  );
}
