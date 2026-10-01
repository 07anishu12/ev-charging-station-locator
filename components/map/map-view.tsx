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

export const STATION_FOCUS_ZOOM = 16;

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
  const pendingFocusStationIdRef = useRef<string | null>(selectedStationId ?? null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep pending focus station ref updated if selection happens before load
  useEffect(() => {
    pendingFocusStationIdRef.current = selectedStationId ?? null;
  }, [selectedStationId]);

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

      // If a pending selected station exists at mount, focus it immediately
      if (pendingFocusStationIdRef.current) {
        const targetStation = initialStationsRef.current.find(
          (s) => s.id === pendingFocusStationIdRef.current,
        );
        if (targetStation) {
          centerLat = targetStation.latitude;
          centerLng = targetStation.longitude;
          zoom = STATION_FOCUS_ZOOM;
        }
      } else if (initialStationsRef.current.length > 0 && initialZoom === 5) {
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
        const iconHtml = isSelected
          ? `
            <div style="
              position: relative;
              width: 44px;
              height: 44px;
              background-color: ${color};
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 0 0 3px #16C784, 0 8px 24px rgba(7, 59, 42, 0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
              font-weight: bold;
              transform: scale(1.1);
              transition: transform 0.2s ease;
            ">
              ⚡
            </div>
          `
          : `
            <div style="
              position: relative;
              width: 32px;
              height: 32px;
              background-color: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 3px 10px rgba(0,0,0,0.22);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 13px;
              font-weight: bold;
              transition: transform 0.2s ease;
            ">
              ⚡
            </div>
          `;

        const icon = L.divIcon({
          html: iconHtml,
          className: "custom-charger-pin",
          iconSize: isSelected ? [44, 44] : [32, 32],
          iconAnchor: isSelected ? [22, 22] : [16, 16],
        });

        const marker = L.marker([station.latitude, station.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        const connectorsSummary = station.connectors
          ? station.connectors.map((c) => c.type).join(", ")
          : "";

        const popupHtml = `
          <div style="font-family: inherit; padding: 4px; min-width: 200px; max-width: 260px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0f6b45; margin-bottom: 2px;">
              ${station.operator.name}
            </div>
            <div style="font-weight: 800; color: #073b2a; font-size: 14px; line-height: 1.3; margin-bottom: 4px;">
              ${station.name}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="font-size: 10px; font-weight: 700; color: ${color}; background: ${color}18; padding: 2px 6px; border-radius: 4px;">
                ${station.status}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #073b2a; background: #eafbf3; padding: 2px 6px; border-radius: 4px;">
                ⚡ ${station.fastestPowerKw} kW
              </span>
            </div>
            ${connectorsSummary ? `
              <div style="font-size: 11px; color: #68756f; margin-bottom: 8px; line-height: 1.3;">
                <span style="font-weight: 600;">Connectors:</span> ${connectorsSummary}
              </div>
            ` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #dce8e1; margin-top: 6px; padding-top: 6px;">
              <a href="/station/${station.slug}" style="display: inline-flex; align-items: center; font-size: 12px; font-weight: 700; color: #16c784; text-decoration: none;">
                View Details →
              </a>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml, { offset: [0, -12] });

        marker.on("click", () => {
          onSelectStation?.(station);
          map.flyTo([station.latitude, station.longitude], STATION_FOCUS_ZOOM, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
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
          // Smoothly fly to the exact station coordinates and zoom to station level (16)
          map.flyTo([sel.latitude, sel.longitude], STATION_FOCUS_ZOOM, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
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
