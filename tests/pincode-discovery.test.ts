import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  CANONICAL_PINCODES,
  findNearbyCanonicalPincodes,
} from "@/lib/geo/canonical-pincodes";
import { distanceInKilometers } from "@/lib/geo/distance";
import {
  getPincodeStationData,
  resolvePincode,
} from "@/services/pincodes/pincode-service";
import { GET as getPincodeApi } from "@/app/api/pincodes/[pincode]/route";
import type { NextRequest } from "next/server";

describe("PIN Resolution & Geographic Anchor", () => {
  it("resolves canonical PIN codes to accurate city, state, district and coordinates", async () => {
    // 110059: Uttam Nagar, Delhi
    const loc59 = await resolvePincode("110059");
    expect(loc59).not.toBeNull();
    expect(loc59?.pincode).toBe("110059");
    expect(loc59?.city).toBe("Delhi");
    expect(loc59?.state).toBe("Delhi");
    expect(loc59?.district).toBe("West Delhi");
    expect(loc59?.hasCoordinates).toBe(true);
    expect(loc59?.latitude).toBeCloseTo(28.6219, 3);
    expect(loc59?.longitude).toBeCloseTo(77.0625, 3);

    // 110058: Janakpuri, Delhi
    const loc58 = await resolvePincode("110058");
    expect(loc58?.city).toBe("Delhi");
    expect(loc58?.district).toBe("West Delhi");
    expect(loc58?.hasCoordinates).toBe(true);

    // 400051: BKC, Mumbai
    const locMum = await resolvePincode("400051");
    expect(locMum?.city).toBe("Mumbai");
    expect(locMum?.state).toBe("Maharashtra");
    expect(locMum?.stateCode).toBe("MH");

    // 560001: Bengaluru GPO
    const locBlr = await resolvePincode("560001");
    expect(locBlr?.city).toBe("Bengaluru");
    expect(locBlr?.state).toBe("Karnataka");
    expect(locBlr?.stateCode).toBe("KA");
  });

  it("fails gracefully and NEVER invents coordinates for uncataloged valid 6-digit PINs", async () => {
    const uncataloged = await resolvePincode("119999");
    expect(uncataloged).not.toBeNull();
    expect(uncataloged?.pincode).toBe("119999");
    expect(uncataloged?.state).toBe("Delhi"); // Inferred from prefix "11"
    expect(uncataloged?.hasCoordinates).toBe(false);
    expect(uncataloged?.latitude).toBeNull();
    expect(uncataloged?.longitude).toBeNull();
  });

  it("rejects invalid PIN formats properly", async () => {
    expect(await resolvePincode("123")).toBeNull();
    expect(await resolvePincode("1100591")).toBeNull();
    expect(await resolvePincode("ABCDEF")).toBeNull();
    expect(await resolvePincode("")).toBeNull();
  });
});

describe("Geographic Proximity vs Numerical Proximity", () => {
  it("CRITICAL: Proximity is coordinate-based and does NOT assume sequential PIN closeness", () => {
    // 110059 coordinates (Uttam Nagar)
    const pin59 = CANONICAL_PINCODES["110059"];
    expect(pin59).toBeDefined();

    // 110058 (Janakpuri): numerical diff = 1
    const dist58 = distanceInKilometers(
      { latitude: pin59.latitude, longitude: pin59.longitude },
      { latitude: CANONICAL_PINCODES["110058"].latitude, longitude: CANONICAL_PINCODES["110058"].longitude },
    );

    // 110078 (Dwarka Sec 14): numerical diff = 19
    const dist78 = distanceInKilometers(
      { latitude: pin59.latitude, longitude: pin59.longitude },
      { latitude: CANONICAL_PINCODES["110078"].latitude, longitude: CANONICAL_PINCODES["110078"].longitude },
    );

    // 110057 (Vasant Vihar): numerical diff = 2
    const dist57 = distanceInKilometers(
      { latitude: pin59.latitude, longitude: pin59.longitude },
      { latitude: CANONICAL_PINCODES["110057"].latitude, longitude: CANONICAL_PINCODES["110057"].longitude },
    );

    // 110078 (numerical diff 19) is physically only ~3.8 km away,
    // whereas 110057 (numerical diff 2) is ~11.5 km away!
    expect(dist78).toBeLessThan(dist57);
    expect(dist58).toBeLessThan(dist78);

    // Verify discovered nearby PINs are ranked strictly by physical distance
    const nearby = findNearbyCanonicalPincodes(pin59.latitude, pin59.longitude, {
      excludePincode: "110059",
      maxDistanceKm: 20,
    });

    expect(nearby.length).toBeGreaterThan(0);
    // 110058 and 110078 must appear before 110057 in geographic order
    const index58 = nearby.findIndex((p) => p.pincode === "110058");
    const index78 = nearby.findIndex((p) => p.pincode === "110078");
    const index57 = nearby.findIndex((p) => p.pincode === "110057");

    expect(index58).toBeGreaterThanOrEqual(0);
    expect(index78).toBeGreaterThan(index58);
    if (index57 >= 0) {
      expect(index57).toBeGreaterThan(index78);
    }
  });
});

describe("PIN Discovery & Nearby Stations Service", () => {
  it("Case 1: PIN with exact stations returns exactPincodeCount > 0", async () => {
    // PIN 110058 has station 'Tata Power - Janakpuri District Centre Hub' (st-del-15)
    const result = await getPincodeStationData("110058", { radiusKm: 10 });

    expect(result.pincode).toBe("110058");
    expect(result.exactPincodeCount).toBeGreaterThan(0);
    const exactMatch = result.stations.find((s) => s.matchType === "exact_pincode");
    expect(exactMatch).toBeDefined();
    expect(exactMatch?.stationPincode).toBe("110058");
    expect(exactMatch?.distanceKm).toBeCloseTo(0, 0);
  });

  it("Case 2: PIN with zero exact stations returns geographically nearby stations (NOT empty)", async () => {
    // PIN 110059 (Uttam Nagar) has 0 direct stations, but neighbors Janakpuri (110058) & Dwarka (110078)
    const result = await getPincodeStationData("110059", { radiusKm: 5 });

    expect(result.pincode).toBe("110059");
    expect(result.exactPincodeCount).toBe(0);
    // Crucial requirement: Must NOT show empty "No data found"
    expect(result.total).toBeGreaterThan(0);
    expect(result.stations.length).toBeGreaterThan(0);

    // Nearby stations must include neighbor stations (e.g. 110058 at ~2km, 110078 at ~3.8km)
    for (const station of result.stations) {
      expect(station.distanceKm).toBeLessThanOrEqual(5);
      expect(station.distanceMeters).toBeGreaterThan(0);
      expect(["nearby_pincode", "same_city", "radius"]).toContain(station.matchType);
    }

    // Nearby PINs list must be populated
    expect(result.nearbyPincodes.length).toBeGreaterThan(0);
    expect(result.nearbyPincodes[0].pincode).toBe("110058");
  });

  it("Case 4: Geographic radius filtering enforces boundary accurately", async () => {
    // At 3 km from 110059, Janakpuri (110058 at ~2.0 km) is included
    const narrow = await getPincodeStationData("110059", { radiusKm: 3 });
    const narrowIds = new Set(narrow.stations.map((s) => s.id));
    expect(narrowIds.size).toBe(narrow.stations.length);

    // At 10 km from 110059, more distant hubs (e.g. Dwarka Sec 21, Punjabi Bagh) are included
    const wide = await getPincodeStationData("110059", { radiusKm: 10 });
    expect(wide.total).toBeGreaterThan(narrow.total);

    for (const id of narrowIds) {
      expect(wide.stations.some((s) => s.id === id)).toBe(true);
    }

    for (const st of wide.stations) {
      expect(st.distanceKm).toBeLessThanOrEqual(10);
    }
  });

  it("Case 5: Stations contain actual coordinates, distanceKm, and distanceMeters", async () => {
    const result = await getPincodeStationData("110059", { radiusKm: 10 });

    for (const st of result.stations) {
      expect(st.latitude).toBeGreaterThan(20);
      expect(st.longitude).toBeGreaterThan(70);
      expect(st.distanceKm).toBeGreaterThanOrEqual(0);
      expect(st.distanceMeters).toBeGreaterThanOrEqual(0);
      expect(st.distanceMeters).toBe(Math.round(st.distanceKm * 1000));
    }
  });

  it("Case 6: Duplicate prevention — a station appears only once", async () => {
    const result = await getPincodeStationData("110059", { radiusKm: 25, limit: 50 });
    const ids = result.stations.map((s) => s.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });

  it("Case 7: Pagination preserves total count independently of page limit", async () => {
    const p1 = await getPincodeStationData("110059", { radiusKm: 25, page: 1, limit: 5 });
    expect(p1.pagination.page).toBe(1);
    expect(p1.pagination.limit).toBe(5);
    expect(p1.stations.length).toBe(5);
    expect(p1.pagination.total).toBeGreaterThan(5);
    expect(p1.pagination.hasMore).toBe(true);

    const p2 = await getPincodeStationData("110059", { radiusKm: 25, page: 2, limit: 5 });
    expect(p2.pagination.page).toBe(2);
    expect(p2.pagination.limit).toBe(5);
    expect(p2.stations.length).toBe(5);
    // Stations on page 2 must be different from page 1
    const p1Ids = new Set(p1.stations.map((s) => s.id));
    for (const st of p2.stations) {
      expect(p1Ids.has(st.id)).toBe(false);
    }
  });

  it("Case 9: Missing PIN coordinates fails gracefully without crash", async () => {
    // 119999 is valid format but has no coordinates in DB or catalog
    const result = await getPincodeStationData("119999", { radiusKm: 5 });
    expect(result.location.hasCoordinates).toBe(false);
    expect(result.location.latitude).toBeNull();
    expect(result.location.longitude).toBeNull();
    expect(result.exactPincodeCount).toBe(0);
    expect(result.total).toBe(0);
    expect(result.stations).toEqual([]);
    expect(result.nearbyPincodes).toEqual([]);
  });
});

describe("PIN API Routes (/api/pincodes/[pincode] & /api/stations/pincode/[pincode])", () => {
  it("serves structured nearby station discovery with counts and location", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("radiusKm=5&page=1&limit=10"),
      },
    } as unknown as NextRequest;

    const res = await getPincodeApi(req, {
      params: Promise.resolve({ pincode: "110059" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.data;

    expect(data.pincode).toBe("110059");
    expect(data.location.city).toBe("Delhi");
    expect(data.location.district).toBe("West Delhi");
    expect(data.location.latitude).toBeCloseTo(28.6219, 3);
    expect(data.exactPincodeCount).toBe(0);
    expect(data.total).toBeGreaterThan(0);
    expect(data.stations.length).toBeGreaterThan(0);
    expect(data.nearbyPincodes.length).toBeGreaterThan(0);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
  });

  it("Case 8: Rejects invalid PIN code with 400 validation error", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as unknown as NextRequest;

    const res = await getPincodeApi(req, {
      params: Promise.resolve({ pincode: "invalid-pin" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
