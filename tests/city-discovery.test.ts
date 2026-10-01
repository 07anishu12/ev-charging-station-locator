import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  calculateCityCentroid,
  resolveCanonicalCity,
  resolveCanonicalState,
} from "@/lib/geo/canonical-data";
import { getCityStationData } from "@/services/stations/station-service";
import { GET as getCityApi } from "@/app/api/cities/[slug]/route";
import type { NextRequest } from "next/server";

describe("Canonical Geo Resolution Layer", () => {
  it("resolves historical and alternative city aliases to canonical names", () => {
    // Bangalore -> Bengaluru
    const blr = resolveCanonicalCity("Bangalore");
    expect(blr).not.toBeNull();
    expect(blr?.canonicalSlug).toBe("bengaluru");
    expect(blr?.canonicalName).toBe("Bengaluru");
    expect(blr?.stateCode).toBe("KA");
    expect(blr?.stateName).toBe("Karnataka");

    // Bombay -> Mumbai
    const bom = resolveCanonicalCity("Bombay");
    expect(bom?.canonicalSlug).toBe("mumbai");
    expect(bom?.canonicalName).toBe("Mumbai");
    expect(bom?.stateCode).toBe("MH");

    // Gurgaon -> Gurugram
    const ggn = resolveCanonicalCity("Gurgaon");
    expect(ggn?.canonicalSlug).toBe("gurugram");
    expect(ggn?.canonicalName).toBe("Gurugram");
    expect(ggn?.stateCode).toBe("HR");

    // New Delhi -> Delhi
    const del = resolveCanonicalCity("New Delhi");
    expect(del?.canonicalSlug).toBe("delhi");
    expect(del?.canonicalName).toBe("Delhi");
    expect(del?.stateCode).toBe("DL");

    // Calcutta -> Kolkata
    const cc = resolveCanonicalCity("Calcutta");
    expect(cc?.canonicalSlug).toBe("kolkata");
    expect(cc?.canonicalName).toBe("Kolkata");
    expect(cc?.stateCode).toBe("WB");

    // Madras -> Chennai
    const maa = resolveCanonicalCity("Madras");
    expect(maa?.canonicalSlug).toBe("chennai");
    expect(maa?.canonicalName).toBe("Chennai");
    expect(maa?.stateCode).toBe("TN");

    // Poona -> Pune
    const pn = resolveCanonicalCity("Poona");
    expect(pn?.canonicalSlug).toBe("pune");

    // Baroda -> Vadodara
    const bd = resolveCanonicalCity("Baroda");
    expect(bd?.canonicalSlug).toBe("vadodara");

    // Cochin -> Kochi
    const co = resolveCanonicalCity("Cochin");
    expect(co?.canonicalSlug).toBe("kochi");

    // Trivandrum -> Thiruvananthapuram
    const tvm = resolveCanonicalCity("Trivandrum");
    expect(tvm?.canonicalSlug).toBe("thiruvananthapuram");
  });

  it("handles case-insensitivity, leading/trailing whitespace, and hyphenated variations", () => {
    expect(resolveCanonicalCity("  BANGALORE  ")?.canonicalSlug).toBe("bengaluru");
    expect(resolveCanonicalCity("new-delhi")?.canonicalSlug).toBe("delhi");
    expect(resolveCanonicalCity("Navi Mumbai")?.canonicalSlug).toBe("navi-mumbai");
    expect(resolveCanonicalCity("non-existent-city-xyz")).toBeNull();
  });

  it("resolves Indian states and union territories correctly", () => {
    // By slug
    expect(resolveCanonicalState("delhi")?.code).toBe("DL");
    expect(resolveCanonicalState("maharashtra")?.code).toBe("MH");
    expect(resolveCanonicalState("karnataka")?.code).toBe("KA");

    // By state code
    expect(resolveCanonicalState("DL")?.slug).toBe("delhi");
    expect(resolveCanonicalState("KA")?.slug).toBe("karnataka");
    expect(resolveCanonicalState("TN")?.slug).toBe("tamil-nadu");

    // By alternative names/spellings
    expect(resolveCanonicalState("National Capital Territory of Delhi")?.code).toBe("DL");
    expect(resolveCanonicalState("NCT of Delhi")?.code).toBe("DL");
    expect(resolveCanonicalState("Maharashtra ")?.code).toBe("MH");
    expect(resolveCanonicalState("Orissa")?.slug).toBe("odisha");
    expect(resolveCanonicalState("Unknown Place")).toBeNull();
  });

  it("calculates city centroid coordinates accurately", () => {
    const coords = [
      { lat: 28.6139, lng: 77.209 },
      { lat: 28.5284, lng: 77.2185 },
      { lat: 28.7145, lng: 77.1132 },
    ];

    const centroid = calculateCityCentroid(coords);
    expect(centroid).not.toBeNull();
    expect(centroid?.lat).toBeCloseTo((28.6139 + 28.5284 + 28.7145) / 3, 3);
    expect(centroid?.lng).toBeCloseTo((77.209 + 77.2185 + 77.1132) / 3, 3);

    // Empty list returns null
    expect(calculateCityCentroid([])).toBeNull();
  });
});

describe("City Station Data & Pagination Service", () => {
  it("REGRESSION: returns real total stations without truncation (not capped to 2)", async () => {
    const result = await getCityStationData("delhi", { page: 1, pageSize: 20 });

    // The dataset has 35 Delhi mock stations
    expect(result.pagination.total).toBeGreaterThanOrEqual(20);
    expect(result.pagination.total).toBe(35);
    expect(result.items.length).toBe(20);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.pageSize).toBe(20);
    expect(result.pagination.totalPages).toBe(2);

    // Verify first station data integrity
    const firstStation = result.items[0];
    expect(firstStation.name).toBeTruthy();
    expect(firstStation.city.slug).toBe("delhi");
    expect(firstStation.state.code).toBe("DL");
    expect(firstStation.connectors.length).toBeGreaterThan(0);
    expect(firstStation.fastestPowerKw).toBeGreaterThan(0);
  });

  it("handles subsequent pages properly in multi-page datasets", async () => {
    const page2 = await getCityStationData("delhi", { page: 2, pageSize: 20 });

    // Second page should contain remaining 15 stations
    expect(page2.pagination.page).toBe(2);
    expect(page2.pagination.total).toBe(35);
    expect(page2.items.length).toBe(15);
  });

  it("resolves alias when querying getCityStationData (e.g., 'new-delhi' -> 'delhi')", async () => {
    const result = await getCityStationData("new-delhi", { page: 1, pageSize: 20 });
    expect(result.city.slug).toBe("delhi");
    expect(result.city.name).toBe("Delhi");
    expect(result.pagination.total).toBe(35);
    expect(result.items.length).toBe(20);
  });

  it("handles unknown or empty cities gracefully", async () => {
    const result = await getCityStationData("unknown-desert-town", { page: 1, pageSize: 20 });
    expect(result.pagination.total).toBe(0);
    expect(result.items.length).toBe(0);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("filters stations by minimum power and connector type", async () => {
    const fastOnly = await getCityStationData("delhi", { minPowerKw: 100 });
    for (const station of fastOnly.items) {
      expect(station.fastestPowerKw).toBeGreaterThanOrEqual(100);
    }

    const ccsOnly = await getCityStationData("delhi", { connectorType: "ccs2" });
    for (const station of ccsOnly.items) {
      const hasCcs = station.connectors.some(
        (c) => c.normalizedType === "ccs2" || c.type.toLowerCase().includes("ccs"),
      );
      expect(hasCcs).toBe(true);
    }
  });
});

describe("City API Route (/api/cities/[slug])", () => {
  it("serves paginated station data with city metadata", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("page=1&limit=10"),
      },
    } as unknown as NextRequest;

    const response = await getCityApi(req, {
      params: Promise.resolve({ slug: "delhi" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.city.slug).toBe("delhi");
    expect(json.data.pagination.page).toBe(1);
    expect(json.data.pagination.limit).toBe(10);
    expect(json.data.pagination.total).toBe(35);
    expect(json.data.stations.length).toBe(10);
  });

  it("clamps out-of-bounds pagination parameters safely", async () => {
    const req = {
      nextUrl: {
        searchParams: new URLSearchParams("page=-5&limit=500"),
      },
    } as unknown as NextRequest;

    const response = await getCityApi(req, {
      params: Promise.resolve({ slug: "delhi" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toBeDefined();
    expect(json.data.pagination.page).toBe(1); // clamped from -5 to 1
    expect(json.data.pagination.limit).toBe(100); // clamped from 500 to max 100
  });
});
