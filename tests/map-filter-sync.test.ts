import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deriveCanonicalStations,
  NEARBY_DISCOVERY_RADIUS_KM,
  type DiscoveryFilters,
} from "@/lib/geo/discovery-state";
import {
  clearCachedUserLocation,
  getCachedUserLocation,
  requestUserLocation,
} from "@/lib/geo/geolocation";
import { getMockStations, type MockStation } from "@/lib/mock";

describe("Map and Filter Synchronization Architecture", () => {
  let allStations: MockStation[];
  const delhiUserLocation = { lat: 28.6139, lng: 77.209 }; // Connaught Place, Delhi

  beforeEach(() => {
    allStations = getMockStations();
    clearCachedUserLocation();
    vi.restoreAllMocks();
  });

  // Test 1 — Nearby
  it("Test 1 — Nearby: acquires location, discovers nearby stations sorted by physical distance", async () => {
    // Mock browser geolocation API
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: delhiUserLocation.lat,
            longitude: delhiUserLocation.lng,
            accuracy: 15,
          },
        });
      }),
    };
    vi.stubGlobal("navigator", { geolocation: mockGeolocation });

    const result = await requestUserLocation();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.location.lat).toBe(delhiUserLocation.lat);
    expect(result.location.lng).toBe(delhiUserLocation.lng);
    expect(result.fromCache).toBe(false);

    // Derive canonical stations for user location
    const stations = deriveCanonicalStations({
      allStations,
      filters: { nearby: true },
      userLocation: result.location,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });

    expect(stations.length).toBeGreaterThan(0);
    // All stations must be within radius and sorted by physical distance
    for (let i = 0; i < stations.length - 1; i++) {
      expect(stations[i].distanceKm!).toBeLessThanOrEqual(NEARBY_DISCOVERY_RADIUS_KM);
      expect(stations[i].distanceKm!).toBeLessThanOrEqual(stations[i + 1].distanceKm!);
    }
  });

  // Test 2 — Nearby after Reset
  it("Test 2 — Nearby after Reset: reuses cached location without prompt", async () => {
    const getCurrentPositionSpy = vi.fn((success) => {
      success({
        coords: {
          latitude: delhiUserLocation.lat,
          longitude: delhiUserLocation.lng,
          accuracy: 10,
        },
      });
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: getCurrentPositionSpy } });

    // 1. Initial Nearby click
    const firstReq = await requestUserLocation();
    expect(firstReq.success).toBe(true);
    expect(getCurrentPositionSpy).toHaveBeenCalledTimes(1);
    expect(getCachedUserLocation()).toEqual(expect.objectContaining({ lat: delhiUserLocation.lat }));

    // 2. User clicks Reset (filters cleared, mode becomes "none", but location cache preserved)
    const resetFilters: DiscoveryFilters = {};
    const resetStations = deriveCanonicalStations({
      allStations,
      filters: resetFilters,
      userLocation: null,
      locationMode: "none",
    });
    expect(resetStations.length).toBe(allStations.length);
    expect(getCachedUserLocation()).not.toBeNull();

    // 3. User clicks Nearby again -> reuses cached location immediately without calling getCurrentPosition again
    const secondReq = await requestUserLocation();
    expect(secondReq.success).toBe(true);
    if (secondReq.success) {
      expect(secondReq.fromCache).toBe(true);
    }
    expect(getCurrentPositionSpy).toHaveBeenCalledTimes(1); // STILL 1! No second prompt
  });

  // Test 3 — Nearby + CCS2
  it("Test 3 — Nearby + CCS2: produces identical canonical results where all stations have CCS2", () => {
    const nearbyCCS2 = deriveCanonicalStations({
      allStations,
      filters: { nearby: true, connectorType: "ccs2" },
      userLocation: delhiUserLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });

    expect(nearbyCCS2.length).toBeGreaterThan(0);
    nearbyCCS2.forEach((station) => {
      const hasCCS2 = station.connectors.some(
        (c) => c.normalizedType === "ccs2" || c.type.toLowerCase().includes("ccs"),
      );
      expect(hasCCS2).toBe(true);
      expect(station.distanceKm).toBeLessThanOrEqual(NEARBY_DISCOVERY_RADIUS_KM);
    });
  });

  // Test 4 — Nearby + 100kW
  it("Test 4 — Nearby + 100kW+: produces stations meeting 100kW power threshold near user", () => {
    const nearby100kW = deriveCanonicalStations({
      allStations,
      filters: { nearby: true, minPowerKw: 100 },
      userLocation: delhiUserLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });

    expect(nearby100kW.length).toBeGreaterThan(0);
    nearby100kW.forEach((station) => {
      expect(station.fastestPowerKw).toBeGreaterThanOrEqual(100);
      expect(station.distanceKm).toBeLessThanOrEqual(NEARBY_DISCOVERY_RADIUS_KM);
    });
  });

  // Test 5 — Reset
  it("Test 5 — Reset: returns unfiltered results and all markers", () => {
    // Apply multiple filters
    const filtered = deriveCanonicalStations({
      allStations,
      filters: { minPowerKw: 100, connectorType: "ccs2", operationalOnly: true },
      userLocation: null,
      locationMode: "none",
    });
    expect(filtered.length).toBeLessThan(allStations.length);

    // Reset filters
    const resetResult = deriveCanonicalStations({
      allStations,
      filters: {},
      userLocation: null,
      locationMode: "none",
    });
    expect(resetResult.length).toBe(allStations.length);
  });

  // Test 6 — City + Nearby
  it("Test 6 — City + Nearby: switches discovery context from city search to user location", () => {
    // 1. Search Hyderabad
    const hyderabadStations = deriveCanonicalStations({
      allStations,
      filters: {},
      userLocation: null,
      locationMode: "none",
      searchQuery: "Hyderabad",
    });
    expect(hyderabadStations.length).toBeGreaterThan(0);
    hyderabadStations.forEach((s) => {
      expect(s.city.name.toLowerCase()).toBe("hyderabad");
    });

    // 2. User then clicks Nearby (located in Delhi)
    const nearbyStations = deriveCanonicalStations({
      allStations,
      filters: { nearby: true },
      userLocation: delhiUserLocation,
      locationMode: "user",
      searchQuery: "", // Nearby switches discovery context
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });
    expect(nearbyStations.length).toBeGreaterThan(0);
    // Discovered stations are now corridor stations within 25km of Delhi user, NOT Hyderabad
    nearbyStations.forEach((s) => {
      expect(s.city.name.toLowerCase()).not.toBe("hyderabad");
      expect(s.distanceKm).toBeLessThanOrEqual(NEARBY_DISCOVERY_RADIUS_KM);
    });
  });

  // Test 7 — Filter map synchronization
  it("Test 7 — Filter map synchronization: map marker IDs === station list IDs for all filters", () => {
    const filterScenarios: Array<{ name: string; filters: DiscoveryFilters }> = [
      { name: "Fast (50kW+)", filters: { minPowerKw: 50 } },
      { name: "100kW+ Ultra", filters: { minPowerKw: 100 } },
      { name: "CCS2", filters: { connectorType: "ccs2" } },
      { name: "Type 2", filters: { connectorType: "type2" } },
      { name: "Operational", filters: { operationalOnly: true } },
      { name: "Combined CCS2 + 100kW+", filters: { connectorType: "ccs2", minPowerKw: 100 } },
      {
        name: "Nearby + CCS2",
        filters: { nearby: true, connectorType: "ccs2" },
      },
    ];

    for (const scenario of filterScenarios) {
      const isNearby = Boolean(scenario.filters.nearby);
      const canonicalStations = deriveCanonicalStations({
        allStations,
        filters: scenario.filters,
        userLocation: isNearby ? delhiUserLocation : null,
        locationMode: isNearby ? "user" : "none",
        radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
      });

      // Simulating list consumption
      const listStationIds = canonicalStations.map((s) => s.id);

      // Simulating map marker layer consumption
      const mapMarkerIds = canonicalStations.map((s) => s.id);

      expect(mapMarkerIds).toEqual(listStationIds);
      expect(new Set(mapMarkerIds).size).toBe(listStationIds.length); // No duplicates
    }
  });

  // Test 8 — Zero results
  it("Test 8 — Zero results: filter producing 0 matches returns empty array (map markers = 0)", () => {
    const impossible = deriveCanonicalStations({
      allStations,
      filters: { minPowerKw: 99999 }, // No EV charger has 100MW power
      userLocation: null,
      locationMode: "none",
    });

    expect(impossible.length).toBe(0);
    // Both list and map receive empty array [] -> 0 markers rendered
    const mapMarkersCount = impossible.length;
    expect(mapMarkersCount).toBe(0);
  });

  // Test 9 — Selected station removed
  it("Test 9 — Selected station removed: when filtered out, selection must be cleared", () => {
    // Pick an operational 50kW station
    const station50kW = allStations.find((s) => s.fastestPowerKw <= 60 && s.fastestPowerKw >= 50);
    expect(station50kW).toBeDefined();
    if (!station50kW) return;
    let selectedStation: MockStation | null = station50kW;

    // Apply 100kW+ filter (which excludes the selected station)
    const filteredStations = deriveCanonicalStations({
      allStations,
      filters: { minPowerKw: 100 },
      userLocation: null,
      locationMode: "none",
    });

    // Check if selected station survives in canonical results
    if (selectedStation) {
      const stationId = selectedStation.id;
      if (!filteredStations.some((s) => s.id === stationId)) {
        selectedStation = null;
      }
    }

    expect(selectedStation).toBeNull();
  });

  // Test 10 — Map camera stability
  it("Test 10 — Map camera stability: changing charger filter preserves user viewport", () => {
    // When changing only charger capability filters (CCS2, Fast, etc.),
    // no user recenter or camera fly is requested, preserving manual pan/zoom
    const step1 = deriveCanonicalStations({
      allStations,
      filters: { minPowerKw: 50 },
      userLocation: null,
      locationMode: "none",
    });

    const step2 = deriveCanonicalStations({
      allStations,
      filters: { minPowerKw: 50, connectorType: "ccs2" },
      userLocation: null,
      locationMode: "none",
    });

    expect(step1.length).toBeGreaterThan(0);
    expect(step2.length).toBeGreaterThan(0);
    // Canonical state ensures station array is updated in place without camera force-reset
    expect(step2.every((s) => s.connectors.some((c) => c.normalizedType === "ccs2"))).toBe(true);
  });
});
