"use client";

import type { Layer, Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

import { MapSkeleton } from "@/components/ui/skeletons";
import type { MockStation } from "@/lib/mock";

interface MapViewProps {
  stations: MockStation[];
  selectedStationId?: string;
  onSelectStation?: (station: MockStation) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
}

export function MapView({
  stations,
  selectedStationId,
  onSelectStation,
  initialCenter = { lat: 20.5937, lng: 78.9629 },
  initialZoom = 5,
  className = "",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<{ [id: string]: Marker }>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!containerRef.current) return;

      // Dynamically import leaflet to prevent SSR issues
      const L = (await import("leaflet")).default;

      // Ensure leaflet styles are present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!isMounted) return;

      // Clean up existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Determine center
      let centerLat = initialCenter.lat;
      let centerLng = initialCenter.lng;
      let zoom = initialZoom;

      if (stations.length > 0 && initialZoom === 5) {
        centerLat = stations[0].latitude;
        centerLng = stations[0].longitude;
        zoom = stations.length === 1 ? 14 : 11;
      }

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsLoaded(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom, stations]);

  // Update markers when stations change or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    import("leaflet").then((module) => {
      const L = module.default;
      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker: Layer) => marker.remove());
      markersRef.current = {};

      if (stations.length === 0) return;

      const bounds = L.latLngBounds([]);

      stations.forEach((station) => {
        const isSelected = station.id === selectedStationId;
        const color =
          station.status === "Operational"
            ? "#16C784"
            : station.status === "Not Operational"
            ? "#E5484D"
            : "#8A9490";

        // Create custom HTML icon for charging station
        const iconHtml = `
          <div style="
            position: relative;
            width: ${isSelected ? "38px" : "30px"};
            height: ${isSelected ? "38px" : "30px"};
            background-color: ${color};
            border: 2.5px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 13px;
            font-weight: bold;
            transition: transform 0.2s ease;
            transform: scale(${isSelected ? "1.2" : "1"});
          ">
            ⚡
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: "custom-charger-pin",
          iconSize: [isSelected ? 38 : 30, isSelected ? 38 : 30],
          iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15],
        });

        const marker = L.marker([station.latitude, station.longitude], { icon }).addTo(map);

        marker.on("click", () => {
          onSelectStation?.(station);
          map.panTo([station.latitude, station.longitude], { animate: true });
        });

        markersRef.current[station.id] = marker;
        bounds.extend([station.latitude, station.longitude]);
      });

      // Fit bounds if multiple stations and no specific center override
      if (stations.length > 1 && !selectedStationId) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else if (selectedStationId && markersRef.current[selectedStationId]) {
        const sel = stations.find((s) => s.id === selectedStationId);
        if (sel) map.panTo([sel.latitude, sel.longitude], { animate: true });
      }
    });
  }, [stations, selectedStationId, isLoaded, onSelectStation]);

  return (
    <div className={`relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs ${className}`}>
      <div ref={containerRef} className="w-full h-full min-h-[360px]" />
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
    </div>
  );
}
