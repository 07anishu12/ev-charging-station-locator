"use client";

import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

import { MapSkeleton } from "@/components/ui/skeletons";
import type { Station } from "@fastcharger/shared";

export interface MapCameraTrigger {
  type?: "user" | "station" | "city" | "bounds" | "filter" | "none";
  lat?: number;
  lng?: number;
  zoom?: number;
  timestamp: number;
}

interface MapViewProps {
  stations: Station[];
  selectedStationId?: string;
  onSelectStation?: (station: Station) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  isNearbyActive?: boolean;
  cameraTrigger?: MapCameraTrigger | null;
}

export const STATION_FOCUS_ZOOM = 16;

interface LeafletModule {
  default?: typeof import("leaflet");
  map?: unknown;
}

function resolveLeaflet(module: unknown): typeof import("leaflet") {
  const mod = module as LeafletModule;
  if (mod && mod.default && typeof mod.default.map === "function") {
    return mod.default;
  }
  if (mod && typeof mod.map === "function") {
    return mod as unknown as typeof import("leaflet");
  }
  return (mod?.default ?? mod) as typeof import("leaflet");
}

export function MapView({
  stations,
  selectedStationId,
  onSelectStation,
  initialCenter = { lat: 20.5937, lng: 78.9629 },
  initialZoom = 5,
  className = "",
  userLocation,
  isNearbyActive = false,
  cameraTrigger,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const stationLayerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef<{ [id: string]: Marker }>({});
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const initialStationsRef = useRef(stations);
  const initialUserLocationRef = useRef(userLocation);
  const initialNearbyActiveRef = useRef(isNearbyActive);
  const pendingFocusStationIdRef = useRef<string | null>(selectedStationId ?? null);
  const lastCameraTimestampRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep pending focus station ref updated if selection happens before load
  useEffect(() => {
    pendingFocusStationIdRef.current = selectedStationId ?? null;
  }, [selectedStationId]);

  // 1. Initialize map instance ONCE per mounted container
  useEffect(() => {
    let isMounted = true;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      if (!containerRef.current) return;

      try {
        // Dynamically import leaflet to prevent SSR issues
        const leafletModule = await import("leaflet");
        const L = resolveLeaflet(leafletModule);

        // Ensure leaflet styles are present as fallback if not bundled
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!isMounted || !containerRef.current) return;

        // Clean up existing map or stale leaflet id on container if any
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        const container = containerRef.current as (HTMLDivElement & { _leaflet_id?: number | null }) | null;
        if (container?._leaflet_id) {
          container._leaflet_id = null;
        }

        // Determine initial center
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
        } else if (initialUserLocationRef.current && initialNearbyActiveRef.current) {
          centerLat = initialUserLocationRef.current.lat;
          centerLng = initialUserLocationRef.current.lng;
          zoom = 13;
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
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Create separate dedicated layers for stations and user location
        stationLayerRef.current = L.layerGroup().addTo(map);
        userLayerRef.current = L.layerGroup().addTo(map);

        leafletRef.current = L;
        mapInstanceRef.current = map;
        setIsLoaded(true);

        // Force size invalidation right after mount
        requestAnimationFrame(() => {
          if (isMounted && mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });

        // Observe container size changes (window resize, split pane resize, tab switch)
        if (typeof ResizeObserver !== "undefined" && containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            if (isMounted && mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          });
          resizeObserver.observe(containerRef.current);
        }
      } catch (err) {
        console.error("Leaflet map initialization error:", err);
      }
    }

    initMap();

    const currentContainer = containerRef.current as (HTMLDivElement & { _leaflet_id?: number | null }) | null;

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        stationLayerRef.current = null;
        userLayerRef.current = null;
      }
      if (currentContainer) {
        currentContainer._leaflet_id = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  // 2. Synchronize station markers and user location with CANONICAL station results
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !stationLayerRef.current || !userLayerRef.current) {
      return;
    }

    const syncMarkers = (L: typeof import("leaflet")) => {
      const map = mapInstanceRef.current;
      const stationLayer = stationLayerRef.current;
      const userLayer = userLayerRef.current;
      if (!map || !stationLayer || !userLayer) return;

      // Cleanly clear existing station markers
      stationLayer.clearLayers();
      markersRef.current = {};

      // Clear existing user location marker
      userLayer.clearLayers();

      // Render user location indicator when nearby mode is active
      if (userLocation && isNearbyActive) {
        const userIcon = L.divIcon({
          className: "user-location-marker-container",
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 14px; height: 14px; background-color: #2563eb; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.4), 0 2px 6px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 500,
        });
        userMarker.bindTooltip("Your Location", { direction: "top", offset: [0, -10] });
        userMarker.addTo(userLayer);
      }

      // If no stations match filters, station layer remains empty (0 markers)
      if (stations.length === 0) return;

      // Render updated station markers strictly from canonical results
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
              width: 48px;
              height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                position: absolute;
                inset: 0px;
                border-radius: 50%;
                background: rgba(22, 199, 132, 0.22);
                border: 2px solid #16C784;
                animation: marker-halo-pulse 900ms cubic-bezier(0.16, 1, 0.3, 1) 1 forwards;
              "></div>
              <div style="
                position: relative;
                width: 38px;
                height: 38px;
                background-color: ${color};
                border: 2.5px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 0 3px #16C784, 0 6px 18px rgba(7, 59, 42, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
                font-weight: bold;
              ">
                ⚡
              </div>
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
          iconSize: isSelected ? [48, 48] : [32, 32],
          iconAnchor: isSelected ? [24, 24] : [16, 16],
        });

        const marker = L.marker([station.latitude, station.longitude], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(stationLayer);

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
            ${
              connectorsSummary
                ? `
              <div style="font-size: 11px; color: #68756f; margin-bottom: 8px; line-height: 1.3;">
                <span style="font-weight: 600;">Connectors:</span> ${connectorsSummary}
              </div>
            `
                : ""
            }
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #dce8e1; margin-top: 6px; padding-top: 6px;">
              <a href="/station/${station.slug}" style="display: inline-flex; align-items: center; font-size: 12px; font-weight: 700; color: #16c784; text-decoration: none;">
                View Details →
              </a>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml, {
          offset: [0, -12],
          closeButton: true,
          autoClose: true,
          closeOnClick: true,
          className: "custom-leaflet-popup",
        });

        marker.on("click", () => {
          onSelectStation?.(station);
          map.flyTo([station.latitude, station.longitude], STATION_FOCUS_ZOOM, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
          marker.openPopup();
        });

        markersRef.current[station.id] = marker;
      });

      // If a station is currently selected, highlight and open popup
      if (selectedStationId && markersRef.current[selectedStationId]) {
        const sel = stations.find((s) => s.id === selectedStationId);
        if (sel) {
          map.flyTo([sel.latitude, sel.longitude], STATION_FOCUS_ZOOM, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
          markersRef.current[selectedStationId].openPopup();
        }
      }
    };

    if (leafletRef.current) {
      syncMarkers(leafletRef.current);
    } else {
      import("leaflet").then((module) => {
        const L = resolveLeaflet(module);
        leafletRef.current = L;
        syncMarkers(L);
      });
    }
  }, [stations, selectedStationId, isLoaded, userLocation, isNearbyActive, onSelectStation]);

  // 3. Handle intentional camera transitions independently without disrupting pan/zoom on filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !cameraTrigger) return;

    // Prevent executing the same camera action trigger repeatedly
    if (cameraTrigger.timestamp === lastCameraTimestampRef.current) return;
    lastCameraTimestampRef.current = cameraTrigger.timestamp;

    import("leaflet").then((module) => {
      const L = resolveLeaflet(module);
      const map = mapInstanceRef.current;
      if (!map) return;

      if (cameraTrigger.lat !== undefined && cameraTrigger.lng !== undefined) {
        map.flyTo([cameraTrigger.lat, cameraTrigger.lng], cameraTrigger.zoom ?? 13, {
          duration: 0.8,
          easeLinearity: 0.25,
        });
      } else if (cameraTrigger.type === "bounds" && stations.length > 1) {
        const bounds = L.latLngBounds(stations.map((s) => [s.latitude, s.longitude]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } else if (cameraTrigger.type === "filter" && stations.length === 1) {
        // If filter leaves exactly one station, center on it with reasonable zoom
        map.flyTo([stations[0].latitude, stations[0].longitude], 14, {
          duration: 0.8,
          easeLinearity: 0.25,
        });
      }
    });
  }, [cameraTrigger, isLoaded, stations]);

  return (
    <div
      className={`relative w-full h-full min-h-0 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-xs ${className}`}
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          <MapSkeleton />
        </div>
      )}
    </div>
  );
}
