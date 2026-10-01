import { describe, expect, it } from "vitest";

import { nearbyStationsQuerySchema, pincodeSchema, parseQuery } from "@/lib/api/validation";

describe("API validation", () => {
  it("accepts bounded nearby coordinates and applies defaults", () => {
    const result = parseQuery(
      nearbyStationsQuerySchema,
      new URLSearchParams({ latitude: "28.6139", longitude: "77.2090" }),
    );

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.radiusKm).toBe(10);
  });

  it("rejects malformed PIN codes", () => {
    expect(pincodeSchema.safeParse({ pincode: "1234" }).success).toBe(false);
  });
});
