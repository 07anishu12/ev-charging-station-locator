import { describe, expect, it } from "vitest";

import { apiUrls, routeUrls } from "@/lib/utils/url";

describe("URL generation", () => {
  it("generates encoded discovery routes", () => {
    expect(routeUrls.city("delhi", "new delhi")).toBe("/india/delhi/new%20delhi/ev-charging-stations");
    expect(routeUrls.station("central park/01")).toBe("/station/central%20park%2F01");
  });

  it("generates API URLs", () => {
    expect(apiUrls.nearbyStations()).toBe("/api/stations/nearby");
    expect(apiUrls.pincode("110001")).toBe("/api/pincodes/110001");
  });
});
