import { describe, expect, it } from "vitest";

import { distanceInKilometers } from "@/lib/geo/distance";

describe("distanceInKilometers", () => {
  it("returns zero for the same point", () => {
    expect(distanceInKilometers({ latitude: 20, longitude: 77 }, { latitude: 20, longitude: 77 })).toBe(0);
  });

  it("calculates a useful great-circle distance", () => {
    const distance = distanceInKilometers(
      { latitude: 28.6139, longitude: 77.209 },
      { latitude: 19.076, longitude: 72.8777 },
    );
    expect(distance).toBeGreaterThan(1_100);
    expect(distance).toBeLessThan(1_200);
  });
});
