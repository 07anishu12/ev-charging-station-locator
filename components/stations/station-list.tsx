"use client";

import { StationCard } from "@/components/stations/station-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StationCardSkeleton } from "@/components/ui/skeletons";
import type { Station } from "@fastcharger/shared";

interface StationListProps {
  stations: Station[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  selectedStationId?: string;
  onSelectStation?: (station: Station) => void;
  className?: string;
}

export function StationList({
  stations,
  isLoading = false,
  emptyTitle = "No chargers found",
  emptyDescription = "Try adjusting your filters or search a different area.",
  selectedStationId,
  onSelectStation,
  className = "",
}: StationListProps) {
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <StationCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          selected={station.id === selectedStationId}
          onSelect={onSelectStation}
        />
      ))}
    </div>
  );
}
