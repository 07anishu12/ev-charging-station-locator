import { describe, expect, it } from "vitest";

import {
  getMockCities,
  getMockCityBySlug,
  getMockOperators,
  getMockStateBySlug,
  getMockStates,
  getMockStations,
  getMockStationsByCity,
  getMockStationsByPincode,
  getMockStationsByState,
  getMockStats,
  searchMockEntities,
} from "@/lib/mock";
import { routeUrls } from "@/lib/utils/url";

describe("route generation for all application paths", () => {
  it("generates correct canonical URLs for all required pages", () => {
    expect(routeUrls.home()).toBe("/");
    expect(routeUrls.india()).toBe("/india");
    expect(routeUrls.state("delhi")).toBe("/india/delhi");
    expect(routeUrls.city("delhi", "delhi")).toBe("/india/delhi/delhi/ev-charging-stations");
    expect(routeUrls.city("haryana", "gurugram")).toBe(
      "/india/haryana/gurugram/ev-charging-stations",
    );
    expect(routeUrls.city("maharashtra", "mumbai")).toBe(
      "/india/maharashtra/mumbai/ev-charging-stations",
    );
    expect(routeUrls.pincode("delhi", "delhi", "110001")).toBe(
      "/india/delhi/delhi/110001/ev-charging-stations",
    );
    expect(routeUrls.station("tata-power-aerocity-fast-charging-hub-delhi")).toBe(
      "/station/tata-power-aerocity-fast-charging-hub-delhi",
    );
    expect(routeUrls.map()).toBe("/map");
    expect(routeUrls.map({ nearby: true })).toBe("/map?nearby=true");
    expect(routeUrls.search()).toBe("/search");
    expect(routeUrls.search("delhi")).toBe("/search?q=delhi");
    expect(routeUrls.saved()).toBe("/saved");
  });
});

describe("isolated mock-data layer queries", () => {
  it("provides Indian states with station and city counts", () => {
    const states = getMockStates();
    expect(states.length).toBeGreaterThanOrEqual(10);
    const delhi = getMockStateBySlug("delhi");
    expect(delhi).toBeDefined();
    expect(delhi?.code).toBe("DL");
    expect(delhi?.stationCount).toBeGreaterThan(0);
  });

  it("provides major Indian cities", () => {
    const cities = getMockCities();
    expect(cities.length).toBeGreaterThanOrEqual(8);
    const bengaluru = getMockCityBySlug("bengaluru");
    expect(bengaluru).toBeDefined();
    expect(bengaluru?.stateSlug).toBe("karnataka");
    expect(bengaluru?.popularPincodes).toContain("560001");
  });

  it("provides operators and station counts", () => {
    const operators = getMockOperators();
    expect(operators.length).toBeGreaterThanOrEqual(5);
    const tata = operators.find((op) => op.slug === "tata-power");
    expect(tata).toBeDefined();
    expect(tata?.name).toBe("Tata Power EZ Charge");
  });

  it("filters stations by state, city, power, and connector", () => {
    const all = getMockStations();
    expect(all.length).toBeGreaterThan(0);

    const delhiStations = getMockStationsByState("delhi");
    expect(delhiStations.every((s) => s.state.slug === "delhi")).toBe(true);

    const mumbaiStations = getMockStationsByCity("mumbai");
    expect(mumbaiStations.every((s) => s.city.slug === "mumbai")).toBe(true);

    const fastStations = getMockStations({ minPowerKw: 100 });
    expect(fastStations.every((s) => s.fastestPowerKw >= 100)).toBe(true);

    const ccs2Stations = getMockStations({ connectorType: "ccs2" });
    expect(
      ccs2Stations.every((s) => s.connectors.some((c) => c.normalizedType === "ccs2")),
    ).toBe(true);
  });

  it("supports PIN code lookup and nearby distance calculation", () => {
    const pinResult = getMockStationsByPincode("110001", 30);
    expect(pinResult.stationList.length).toBeGreaterThan(0);
    expect(pinResult.stationList[0].distanceKm).toBeDefined();
  });

  it("provides categorized search results for cities, stations, PINs, and operators", () => {
    const citySearch = searchMockEntities("Bengaluru");
    expect(citySearch.some((r) => r.type === "city" && r.title === "Bengaluru")).toBe(true);

    const pinSearch = searchMockEntities("110001");
    expect(pinSearch.some((r) => r.type === "pincode" && r.title === "110001")).toBe(true);

    const opSearch = searchMockEntities("Statiq");
    expect(opSearch.some((r) => r.type === "operator" && r.title === "Statiq")).toBe(true);
  });

  it("calculates network statistics", () => {
    const stats = getMockStats();
    expect(stats.totalStations).toBeGreaterThan(1000);
    expect(stats.totalCities).toBeGreaterThanOrEqual(8);
    expect(stats.totalStates).toBeGreaterThanOrEqual(10);
    expect(stats.totalOperators).toBeGreaterThanOrEqual(5);
  });
});
