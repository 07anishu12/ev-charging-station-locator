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
  const initialStationsRef = useRef(stations);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

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

      if (!isMounted || !containerRef.current) return;

      // Clean up existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Determine center
      let centerLat = initialCenter.lat;
      let centerLng = initialCenter.lng;
      let zoom = initialZoom;

      if (initialStationsRef.current.length > 0 && initialZoom === 5) {
        centerLat = initialStationsRef.current[0].latitude;
        centerLng = initialStationsRef.current[0].longitude;
        zoom = initialStationsRef.current.length === 1 ? 14 : 11;
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

      // Force size invalidation right after mount
      requestAnimationFrame(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });

      // Observe container size changes (e.g. window resize, split pane resize, tab switch)
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(containerRef.current);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

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
          iconSize: [isSelected ? 38 : 30, selectedStationId ? 38 : 30],
          iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15],
        });

        const marker = L.marker([station.latitude, station.longitude], { icon }).addTo(map);

        const popupHtml = `
          <div style="font-family: inherit; padding: 2px; min-width: 170px;">
            <div style="font-weight: 700; color: #073b2a; font-size: 13px; line-height: 1.3; margin-bottom: 2px;">
              ${station.name}
            </div>
            <div style="color: #68756f; font-size: 11px; margin-bottom: 6px;">
              ${station.operator.name} · ${station.fastestPowerKw}kW
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 10px; font-weight: 700; color: ${color}; background: ${color}18; padding: 2px 6px; border-radius: 4px;">
                ${station.status}
              </span>
              <a href="/station/${station.slug}" style="font-size: 11px; font-weight: 700; color: #16c784; text-decoration: none;">
                Details →
              </a>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml, { offset: [0, -12] });

        marker.on("click", () => {
          onSelectStation?.(station);
          map.panTo([station.latitude, station.longitude], { animate: true });
          marker.openPopup();
        });

        markersRef.current[station.id] = marker;
        bounds.extend([station.latitude, station.longitude]);
      });

      // Fit bounds if multiple stations and no specific center override
      if (stations.length > 1 && !selectedStationId) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else if (selectedStationId && markersRef.current[selectedStationId]) {
        const sel = stations.find((s) => s.id === selectedStationId);
        if (sel) {
          map.panTo([sel.latitude, sel.longitude], { animate: true });
          markersRef.current[selectedStationId].openPopup();
        }
      }
    });
  }, [stations, selectedStationId, isLoaded, onSelectStation]);

  return (
    <div className={`relative w-full h-full min-h-0 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs ${className}`}>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
    </div>
  );
}
