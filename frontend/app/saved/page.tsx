"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { SiteHeader } from "@/components/navigation/site-header";
import { StationList } from "@/components/stations/station-list";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api";
import type { Station } from "@fastcharger/shared";
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
  const [savedStations, setSavedStations] = useState<Station[]>([]);

  useEffect(() => {
    let ignore = false;
    async function loadSaved() {
      try {
        const slugs: string[] = JSON.parse(savedJson);
        const results = await Promise.all(slugs.map((slug) => apiClient.getStation(slug)));
        if (!ignore) {
          setSavedStations(results.filter((s): s is Station => s !== null));
        }
      } catch {
        if (!ignore) setSavedStations([]);
      }
    }
    loadSaved();
    return () => {
      ignore = true;
    };
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
