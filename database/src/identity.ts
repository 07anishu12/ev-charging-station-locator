/**
 * FastCharger Canonical Station Identity Resolver
 *
 * Enforces deterministic station identity rules:
 * 1. Provider Identity Mappings: Maintain multi-provider ID associations so repeated
 *    provider syncs never duplicate physical charging stations.
 * 2. Multi-Attribute Determinism: Never rely solely on station name or coordinates alone.
 *    Identity combines spatial proximity + operator/network slug + upstream provider keys.
 * 3. Stable Canonical Slugs: Generates repeatable slugs that remain stable across delta ingestion runs.
 */

import { createSlug } from "@fastcharger/shared";

export interface DeterministicSlugOptions {
  name?: string | null;
  cityOrDistrict?: string | null;
  providerName?: string;
  providerStationId?: string | number | null;
  latitude?: number;
  longitude?: number;
}

export interface StationProximityCandidate {
  latitude: number;
  longitude: number;
  name?: string | null;
  operatorSlug?: string | null;
}

/**
 * Rounds coordinate to a standard grid resolution.
 * Precision 4 = ~11.1 meters (ideal for EV charging site cluster resolution).
 * Precision 5 = ~1.1 meters.
 */
export function normalizeCoordinate(value: number, precision: number = 4): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates geodesic distance between two points in meters using the Haversine formula.
 * Mirrors database ST_Distance(geography, geography) for in-memory comparisons.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a deterministic, URL-safe slug for a station.
 *
 * Rules:
 * - If providerStationId is present: `[name]-[location]-[provider-prefix]-[id]`
 * - If providerStationId is absent: `[name]-[location]-g[gridLat]-[gridLng]`
 */
export function generateDeterministicStationSlug(options: DeterministicSlugOptions): string {
  const baseName = options.name?.trim() || "charging-station";
  const locationPart = options.cityOrDistrict?.trim() || "";

  let suffix = "";
  if (options.providerStationId !== undefined && options.providerStationId !== null) {
    const providerPrefix = options.providerName ? `${options.providerName}-` : "";
    suffix = `${providerPrefix}${options.providerStationId}`;
  } else if (typeof options.latitude === "number" && typeof options.longitude === "number") {
    const latGrid = Math.round(options.latitude * 10000);
    const lngGrid = Math.round(options.longitude * 10000);
    suffix = `g${latGrid}-${lngGrid}`;
  } else {
    suffix = "poi";
  }

  const candidate = locationPart
    ? `${baseName}-${locationPart}-${suffix}`
    : `${baseName}-${suffix}`;

  return createSlug(candidate);
}

/**
 * Evaluates whether two station candidates represent the same physical charging site.
 * Requires:
 * 1. Geodesic distance <= thresholdMeters (default: 25m)
 * 2. EITHER matching operator slugs OR high name similarity (if operator is unspecified).
 */
export function isProximityDuplicate(
  candidateA: StationProximityCandidate,
  candidateB: StationProximityCandidate,
  thresholdMeters: number = 25,
): boolean {
  const distance = calculateDistanceMeters(
    candidateA.latitude,
    candidateA.longitude,
    candidateB.latitude,
    candidateB.longitude,
  );

  if (distance > thresholdMeters) {
    return false;
  }

  // If both have operator slugs, verify they match
  if (candidateA.operatorSlug && candidateB.operatorSlug) {
    return candidateA.operatorSlug.toLowerCase() === candidateB.operatorSlug.toLowerCase();
  }

  // If either has no operator, compare normalized names
  const nameA = candidateA.name?.trim().toLowerCase() || "";
  const nameB = candidateB.name?.trim().toLowerCase() || "";

  if (nameA && nameB) {
    if (nameA === nameB) return true;
    if (nameA.includes(nameB) || nameB.includes(nameA)) return true;
  }

  // When within 10 meters, consider it the same physical site even if operator is missing
  return distance <= 10;
}
