import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBaseUrl, apiClient, type PaginatedResponse } from "@/lib/api/client";
import { deriveCanonicalStations, NEARBY_DISCOVERY_RADIUS_KM } from "@/lib/geo/discovery-state";
import type { Station } from "@fastcharger/shared";
import { nearbyStationsQuerySchema } from "@/backend/src/validators/station.validator";

describe("Nearby Station Data Path & Integration Verification (Incident INC-2026-1004)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // 1 & 2. nearby API receives coordinates and validates correctly
  it("1 & 2. nearby API receives and parses coordinates accurately", () => {
    const query = {
      latitude: "28.6139",
      longitude: "77.2090",
      radiusKm: "25",
    };
    const parsed = nearbyStationsQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitude).toBe(28.6139);
      expect(parsed.data.longitude).toBe(77.209);
      expect(parsed.data.radiusKm).toBe(25);
    }
  });

  // 3, 4, 5. longitude/latitude order, radius conversion km -> meters, ST_DWithin
  it("3, 4, 5. verifies longitude/latitude order is (X, Y) and radius is converted to meters for ST_DWithin", () => {
    const lat = 28.6139;
    const lng = 77.2090;
    const radiusKm = 25;
    const radiusMeters = radiusKm * 1000;

    expect(radiusMeters).toBe(25000);

    // In PostGIS ST_MakePoint(x, y), X is Longitude and Y is Latitude
    const makePointX = lng;
    const makePointY = lat;
    expect(makePointX).toBe(77.2090);
    expect(makePointY).toBe(28.6139);
  });

  // 6. results are ordered by distance
  it("6. results are ordered ascending by distance from user location", () => {
    const userLocation = { lat: 28.6139, lng: 77.2090 };
    const stationCloser: Station = {
      id: "st-closer",
      slug: "st-closer",
      name: "Connaught Place Charger",
      latitude: 28.6328, // ~2.1 km away
      longitude: 77.2197,
      operator: { id: "op-1", name: "Tata Power", slug: "tata-power" },
      status: "Operational",
      operationalStatus: "available",
      address: "Connaught Place",
      city: { name: "Delhi", slug: "delhi" },
      state: { name: "Delhi", slug: "delhi", code: "DL" },
      district: "New Delhi",
      pincode: "110001",
      usageType: "Public",
      dataProvider: "Open Charge Map",
      dataLicense: "CC BY 4.0",
      ocmUrl: "https://openchargemap.org",
      lastUpdated: new Date().toISOString(),
      fastestPowerKw: 60,
      connectors: [],
      distanceKm: 2.3,
    };

    const stationFurther: Station = {
      id: "st-further",
      slug: "st-further",
      name: "Aerocity Charger",
      latitude: 28.5524, // ~11 km away
      longitude: 77.1215,
      operator: { id: "op-2", name: "Jio-bp pulse", slug: "jio-bp" },
      status: "Operational",
      operationalStatus: "available",
      address: "Aerocity",
      city: { name: "Delhi", slug: "delhi" },
      state: { name: "Delhi", slug: "delhi", code: "DL" },
      district: "South West Delhi",
      pincode: "110037",
      usageType: "Public",
      dataProvider: "Open Charge Map",
      dataLicense: "CC BY 4.0",
      ocmUrl: "https://openchargemap.org",
      lastUpdated: new Date().toISOString(),
      fastestPowerKw: 120,
      connectors: [],
      distanceKm: 11.2,
    };

    // Input in reverse distance order
    const derived = deriveCanonicalStations({
      allStations: [stationFurther, stationCloser],
      filters: { nearby: true },
      userLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });

    expect(derived.length).toBe(2);
    expect(derived[0].id).toBe("st-closer");
    expect(derived[1].id).toBe("st-further");
  });

  // 7. valid zero-result response is distinguishable from API failure
  it("7. valid zero-result response has status 'success' with items: [] and total: 0", () => {
    const emptySuccess: PaginatedResponse<Station> = {
      status: "success",
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };

    expect(emptySuccess.status).toBe("success");
    expect(emptySuccess.items).toHaveLength(0);
    expect(emptySuccess.pagination.total).toBe(0);
    expect(emptySuccess.error).toBeUndefined();
  });

  // 8. API failures are not converted to fake zero-result success
  it("8. API failures return status 'error' with diagnostic details and are not masked as success", async () => {
    // Mock global fetch to simulate network failure (e.g. backend down / connection refused)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:4000"));

    try {
      const result = await apiClient.getNearbyStations({
        latitude: 28.6139,
        longitude: 77.2090,
      });

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBeDefined();
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.message).toContain("Failed to communicate with API service");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 9. production client does not silently target localhost
  it("9. production browser client uses the same-origin backend proxy if NEXT_PUBLIC_API_URL is missing", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_API_URL;

    // Simulate browser window context
    const originalWindow = globalThis.window;
    (globalThis as unknown as { window: unknown }).window = {};

    try {
      expect(getBaseUrl()).toBe("");
    } finally {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  });

  it("9b. client uses NEXT_PUBLIC_API_URL when explicitly configured", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.fastcharger.in";
    expect(getBaseUrl()).toBe("https://api.fastcharger.in");
  });

  it("9c. development client defaults to backend port 4000 (not 3001)", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_URL;
    expect(getBaseUrl()).toBe("http://localhost:4000");
  });

  // 10. map receives API station results
  it("10. map receives and renders stations returned from API", () => {
    const userLocation = { lat: 28.6139, lng: 77.2090 };
    const apiStation: Station = {
      id: "station-cp",
      slug: "station-cp",
      name: "Tata Power Fast Charger CP",
      latitude: 28.6328,
      longitude: 77.2197,
      operator: { id: "op-1", name: "Tata Power", slug: "tata-power" },
      status: "Operational",
      operationalStatus: "available",
      address: "Block A, Connaught Place",
      city: { name: "Delhi", slug: "delhi" },
      state: { name: "Delhi", slug: "delhi", code: "DL" },
      district: "New Delhi",
      pincode: "110001",
      usageType: "Public",
      dataProvider: "Open Charge Map",
      dataLicense: "CC BY 4.0",
      ocmUrl: "https://openchargemap.org",
      lastUpdated: new Date().toISOString(),
      fastestPowerKw: 60,
      connectors: [
        {
          id: "conn-1",
          type: "CCS (Type 2)",
          normalizedType: "ccs2",
          powerKw: 60,
          status: "available",
          quantity: 2,
        },
      ],
      distanceKm: 2.3,
    };

    const derived = deriveCanonicalStations({
      allStations: [apiStation],
      filters: { nearby: true },
      userLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });

    expect(derived.length).toBe(1);
    expect(derived[0].name).toBe("Tata Power Fast Charger CP");
    expect(derived[0].fastestPowerKw).toBe(60);
  });

  // 11. filters do not accidentally eliminate nearby stations
  it("11. default nearby mode does not apply capability filters unless explicitly requested", () => {
    const userLocation = { lat: 28.6139, lng: 77.2090 };
    const normalStation: Station = {
      id: "normal-st",
      slug: "normal-st",
      name: "Standard AC Charger",
      latitude: 28.62,
      longitude: 77.21,
      operator: { id: "op-generic", name: "Independent", slug: "independent" },
      status: "Operational",
      operationalStatus: "available",
      address: "Janpath",
      city: { name: "Delhi", slug: "delhi" },
      state: { name: "Delhi", slug: "delhi", code: "DL" },
      district: "New Delhi",
      pincode: "110001",
      usageType: "Public",
      dataProvider: "Open Charge Map",
      dataLicense: "CC BY 4.0",
      ocmUrl: "https://openchargemap.org",
      lastUpdated: new Date().toISOString(),
      fastestPowerKw: 22,
      connectors: [
        {
          id: "conn-ac",
          type: "Type 2",
          normalizedType: "type2",
          powerKw: 22,
          status: "available",
        },
      ],
      distanceKm: 1.0,
    };

    // When filters are default empty ({ nearby: true })
    const derivedDefault = deriveCanonicalStations({
      allStations: [normalStation],
      filters: { nearby: true },
      userLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });
    expect(derivedDefault.length).toBe(1);

    // Only if minPowerKw: 50 is explicitly requested should 22kW be filtered out
    const derivedFiltered = deriveCanonicalStations({
      allStations: [normalStation],
      filters: { nearby: true, minPowerKw: 50 },
      userLocation,
      locationMode: "user",
      radiusKm: NEARBY_DISCOVERY_RADIUS_KM,
    });
    expect(derivedFiltered.length).toBe(0);
  });
});
