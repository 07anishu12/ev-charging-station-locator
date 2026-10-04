import { distanceInKilometers } from "@/lib/geo/distance";
import type { UserLocation } from "@/lib/geo/geolocation";
import type { Station } from "@fastcharger/shared";

export const NEARBY_DISCOVERY_RADIUS_KM = 25;

export type LocationMode = "none" | "user" | "city" | "pincode" | "station";

export interface DiscoveryFilters {
  minPowerKw?: number;
  connectorType?: string;
  operationalOnly?: boolean;
  nearby?: boolean;
  operatorSlug?: string;
}

export interface DiscoveryState {
  filters: DiscoveryFilters;
  location?: UserLocation | null;
  locationMode: LocationMode;
  center?: {
    latitude: number;
    longitude: number;
  };
  radiusKm: number;
}

export interface MapCameraTrigger {
  type: "user" | "station" | "city" | "bounds" | "none";
  lat?: number;
  lng?: number;
  zoom?: number;
  timestamp: number;
}

export interface DeriveStationsOptions {
  allStations: Station[];
  filters: DiscoveryFilters;
  userLocation: UserLocation | null;
  locationMode: LocationMode;
  searchQuery?: string;
  radiusKm?: number;
}

/**
 * Produces ONE canonical station result set consumed simultaneously by
 * both the station list and the interactive map.
 */
export function deriveCanonicalStations({
  allStations,
  filters,
  userLocation,
  locationMode,
  searchQuery = "",
  radiusKm = NEARBY_DISCOVERY_RADIUS_KM,
}: DeriveStationsOptions): Station[] {
  const query = searchQuery.trim().toLowerCase();

  // 1. If in "user" location mode and location is present, compute spatial proximity
  let baseStations: Station[] = [];

  if (locationMode === "user" && userLocation) {
    const nearbyWithDistance: Array<Station & { calculatedDistance: number }> = [];

    for (const station of allStations) {
      const distance = distanceInKilometers(
        { latitude: userLocation.lat, longitude: userLocation.lng },
        { latitude: station.latitude, longitude: station.longitude },
      );

      if (distance <= radiusKm) {
        nearbyWithDistance.push({
          ...station,
          calculatedDistance: distance,
          distanceKm: Math.round(distance * 10) / 10,
          distanceMeters: Math.round(distance * 1000),
          matchType: "nearby_pincode",
        });
      }
    }

    // Sort strictly by physical distance from user
    nearbyWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
    baseStations = nearbyWithDistance.map((item) => {
      const { calculatedDistance: _dist, ...st } = item;
      void _dist;
      return st;
    });
  } else {
    baseStations = [...allStations];
  }

  // 2. Filter by search query if provided
  if (query) {
    baseStations = baseStations.filter((s) => {
      return (
        s.name.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query) ||
        s.city.name.toLowerCase().includes(query) ||
        s.operator.name.toLowerCase().includes(query) ||
        s.pincode.includes(query)
      );
    });
  }

  // 3. Apply common charger capability filters
  return baseStations.filter((s) => {
    // Minimum charging speed (e.g. 50kW, 100kW)
    if (filters.minPowerKw && s.fastestPowerKw < filters.minPowerKw) {
      return false;
    }

    // Operational status
    if (filters.operationalOnly && s.status !== "Operational") {
      return false;
    }

    // Connector type (e.g. ccs2, type2)
    if (filters.connectorType) {
      const targetType = filters.connectorType.toLowerCase();
      const hasConnector = s.connectors.some(
        (c) =>
          c.normalizedType === targetType ||
          c.type.toLowerCase().includes(targetType),
      );
      if (!hasConnector) return false;
    }

    // Operator network
    if (filters.operatorSlug) {
      const targetSlug = filters.operatorSlug.toLowerCase();
      if (s.operator.slug.toLowerCase() !== targetSlug) {
        return false;
      }
    }

    return true;
  });
}
