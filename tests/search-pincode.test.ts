import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET as getSearchApi } from "@/app/api/search/route";
import { findStationsNearPincode } from "@/services/pincodes/pincode-service";
import type { NextRequest } from "next/server";

describe("Geographic PIN Discovery Service (findStationsNearPincode)", () => {
  it("resolves 110059 (Uttam Nagar) and discovers nearby stations within 10km", async () => {
    const result = await findStationsNearPincode("110059", { radiusKm: 10 });

    expect(result.searchType).toBe("pincode");
    expect(result.pincode).toBe("110059");
    expect(result.origin.city).toBe("Delhi");
    expect(result.origin.district).toBe("West Delhi");
    expect(result.origin.latitude).toBeCloseTo(28.6219, 3);
    expect(result.origin.longitude).toBeCloseTo(77.0625, 3);
    expect(result.origin.hasCoordinates).toBe(true);

    // 110059 has 0 exact stations
    expect(result.counts.exact).toBe(0);

    // But MUST find nearby stations (CRITICAL: not empty!)
    expect(result.counts.total).toBeGreaterThan(0);
    expect(result.resultCount).toBe(result.counts.total);
    expect(result.results.length).toBeGreaterThan(0);

    // Check first nearby station is Janakpuri (110058) at ~2.1 km
    const firstStation = result.results[0];
    expect(firstStation.distanceKm).toBeLessThanOrEqual(2.5);
    expect(firstStation.pincode).toBe("110058");
    expect(["nearby_pincode", "same_city", "radius"]).toContain(firstStation.matchType);

    // Verify distance sorting: every subsequent station must have >= distance
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i].distanceKm).toBeGreaterThanOrEqual(result.results[i - 1].distanceKm);
      expect(result.results[i].distanceMeters).toBeGreaterThanOrEqual(result.results[i - 1].distanceMeters);
    }

    // Nearby PINs list must be populated
    expect(result.nearbyPincodes.length).toBeGreaterThan(0);
    expect(result.nearbyPincodes.some((p) => p.pincode === "110058")).toBe(true);
  });

  it("resolves 110058 (Janakpuri) returning exact match first followed by nearby stations", async () => {
    const result = await findStationsNearPincode("110058", { radiusKm: 10 });

    expect(result.searchType).toBe("pincode");
    expect(result.pincode).toBe("110058");
    expect(result.counts.exact).toBe(1);
    expect(result.counts.total).toBeGreaterThan(1);

    // First station MUST be the exact match with distance ~0
    const exactMatch = result.results[0];
    expect(exactMatch.matchType).toBe("exact_pincode");
    expect(exactMatch.pincode).toBe("110058");
    expect(exactMatch.distanceKm).toBeCloseTo(0, 0);

    // Subsequent stations are nearby matches with distance > 0
    const nearbyMatch = result.results[1];
    expect(["nearby_pincode", "same_city", "radius"]).toContain(nearbyMatch.matchType);
    expect(nearbyMatch.distanceKm).toBeGreaterThan(0);
  });

  it("enforces geographic radius filtering properly", async () => {
    const narrow = await findStationsNearPincode("110059", { radiusKm: 3 });
    const wide = await findStationsNearPincode("110059", { radiusKm: 10 });

    expect(narrow.radiusKm).toBe(3);
    expect(wide.radiusKm).toBe(10);
    expect(wide.counts.total).toBeGreaterThan(narrow.counts.total);

    for (const st of narrow.results) {
      expect(st.distanceKm).toBeLessThanOrEqual(3);
    }

    for (const st of wide.results) {
      expect(st.distanceKm).toBeLessThanOrEqual(10);
    }
  });

  it("handles uncataloged PIN codes gracefully without crashing", async () => {
    const result = await findStationsNearPincode("119999", { radiusKm: 10 });

    expect(result.searchType).toBe("pincode");
    expect(result.pincode).toBe("119999");
    expect(result.origin.hasCoordinates).toBe(false);
    expect(result.counts.total).toBe(0);
    expect(result.results).toEqual([]);
  });
});

describe("Search API Endpoint (GET /api/search)", () => {
  it("identifies 6-digit PIN 110059 and returns geographic discovery payload", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("q=110059&radiusKm=10"),
      },
    } as unknown as NextRequest;

    const res = await getSearchApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const data = json.data;

    expect(data.searchType).toBe("pincode");
    expect(data.query).toBe("110059");
    expect(data.pincode).toBe("110059");
    expect(data.origin).toBeDefined();
    expect(data.origin.city).toBe("Delhi");
    expect(data.origin.latitude).toBeCloseTo(28.6219, 3);
    expect(data.origin.longitude).toBeCloseTo(77.0625, 3);
    expect(data.counts.exact).toBe(0);
    expect(data.counts.total).toBeGreaterThan(0);
    expect(data.results.length).toBeGreaterThan(0);
  });

  it("identifies 6-digit PIN 110058 and returns exact and nearby stations", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("q=110058"),
      },
    } as unknown as NextRequest;

    const res = await getSearchApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const data = json.data;

    expect(data.searchType).toBe("pincode");
    expect(data.pincode).toBe("110058");
    expect(data.counts.exact).toBe(1);
    expect(data.results[0].matchType).toBe("exact_pincode");
  });

  it("handles non-PIN queries as standard text search", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("q=delhi"),
      },
    } as unknown as NextRequest;

    const res = await getSearchApi(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const data = json.data;

    expect(data.searchType).toBe("text");
    expect(data.query).toBe("delhi");
    expect(data.categorized).toBeDefined();
    expect(data.categorized.cities.length).toBeGreaterThan(0);
    expect(data.categorized.cities.some((c: { title: string }) => c.title.toLowerCase().includes("delhi"))).toBe(true);
  });

  it("rejects empty search queries with 400 validation error", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("q="),
      },
    } as unknown as NextRequest;

    const res = await getSearchApi(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
