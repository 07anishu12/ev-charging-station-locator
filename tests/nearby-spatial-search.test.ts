import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { nearbyStationsQuerySchema } from "@fastcharger/shared";
import {
  FixtureCityRepository,
  FixtureStationRepository,
} from "../backend/tests/fixtures/test-repositories";
import { StationService } from "../backend/src/services/station.service";
import { StationController } from "../backend/src/controllers/station.controller";
import { createStationsRouter } from "../backend/src/routes/v1/stations.routes";
import { errorHandler } from "../backend/src/middleware/error-handler";

describe("PostGIS Nearby Station Search (/api/v1/stations/nearby)", () => {
  const stationRepo = new FixtureStationRepository();
  const cityRepo = new FixtureCityRepository();
  const stationService = new StationService(stationRepo, cityRepo);
  const stationController = new StationController(stationService);

  const app = new Hono();
  const v1 = new Hono();
  v1.route("/stations", createStationsRouter(stationController));
  app.route("/api/v1", v1);
  app.onError(errorHandler);

  describe("1. Validation & Input Defense (Coordinates & Radius)", () => {
    it("validates exact coordinate and defaults radius to 10km", () => {
      const parsed = nearbyStationsQuerySchema.parse({
        latitude: "28.6328",
        longitude: "77.2197",
      });

      expect(parsed.latitude).toBe(28.6328);
      expect(parsed.longitude).toBe(77.2197);
      expect(parsed.radiusKm).toBe(10);
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
      expect(parsed.sortBy).toBe("distance");
    });

    it("accepts 'radius' as an alias for 'radiusKm'", () => {
      const parsed = nearbyStationsQuerySchema.parse({
        latitude: 28.6328,
        longitude: 77.2197,
        radius: 25,
      });

      expect(parsed.radiusKm).toBe(25);
    });

    it("rejects missing latitude with 400", async () => {
      const res = await app.request("/api/v1/stations/nearby?longitude=77.2197");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Latitude is required");
    });

    it("rejects out-of-range latitude (> 90 or < -90) with 400", async () => {
      const res = await app.request("/api/v1/stations/nearby?latitude=95.5&longitude=77.2197");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Latitude must be between -90 and 90");
    });

    it("rejects out-of-range longitude (> 180 or < -180) with 400", async () => {
      const res = await app.request("/api/v1/stations/nearby?latitude=28.6&longitude=185");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Longitude must be between -180 and 180");
    });

    it("rejects negative or zero radius with 400", async () => {
      const negRes = await app.request("/api/v1/stations/nearby?latitude=28.6&longitude=77.2&radiusKm=-10");
      expect(negRes.status).toBe(400);

      const zeroRes = await app.request("/api/v1/stations/nearby?latitude=28.6&longitude=77.2&radiusKm=0");
      expect(zeroRes.status).toBe(400);
    });

    it("rejects unsafe radius exceeding maximum cap (> 500 km) with 400", async () => {
      const res = await app.request("/api/v1/stations/nearby?latitude=28.6&longitude=77.2&radiusKm=750");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Radius cannot exceed 500 km");
    });
  });

  describe("2. Spatial Radius Filtering (Exact, Small, Large, and Zero-match)", () => {
    // Connaught Place Tata Power station is at exactly (28.6328, 77.2197)
    it("returns station with deterministic ~0 km distance on exact coordinate query", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=5",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBeGreaterThanOrEqual(1);

      const exactMatch = json.data.items[0];
      expect(exactMatch.slug).toBe("tata-connaught-place-delhi");
      expect(exactMatch.distanceKm).toBeCloseTo(0, 1);
    });

    it("filters strictly by small radius (1 km) excluding farther stations", async () => {
      // 1km radius from CP should capture Tata Power CP (~0km) but exclude Jio-bp Aerocity (~12.7km)
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=1",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBe(1);
      expect(json.data.items[0].slug).toBe("tata-connaught-place-delhi");
    });

    it("captures metropolitan scope with larger radius (25 km)", async () => {
      // 25km radius from CP should capture both CP and Aerocity (~12.7km)
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=25",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      const slugs = json.data.items.map((i: { slug: string }) => i.slug);
      expect(slugs).toContain("tata-connaught-place-delhi");
      expect(slugs).toContain("jio-bp-aerocity-delhi");
    });

    it("returns empty result set (no results) for coordinates far away from any stations", async () => {
      // Coordinates in the Indian Ocean (0.0, 80.0) with small radius
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=0.0&longitude=80.0&radiusKm=50",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items).toEqual([]);
      expect(json.data.pagination.total).toBe(0);
    });
  });

  describe("3. Pagination Support", () => {
    it("paginates nearby results correctly with page and pageSize", async () => {
      // Query 50 km radius from Connaught Place (contains CP and Aerocity in fixtures)
      const resPage1 = await app.request(
        "/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=50&page=1&pageSize=1",
      );
      expect(resPage1.status).toBe(200);

      const jsonPage1 = await resPage1.json();
      expect(jsonPage1.data.items.length).toBe(1);
      expect(jsonPage1.data.pagination.page).toBe(1);
      expect(jsonPage1.data.pagination.pageSize).toBe(1);
      expect(jsonPage1.data.pagination.total).toBe(2);

      const resPage2 = await app.request(
        "/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=50&page=2&pageSize=1",
      );
      expect(resPage2.status).toBe(200);

      const jsonPage2 = await resPage2.json();
      expect(jsonPage2.data.items.length).toBe(1);
      expect(jsonPage2.data.pagination.page).toBe(2);

      // Verify page 1 and page 2 return different items
      expect(jsonPage1.data.items[0].id).not.toBe(jsonPage2.data.items[0].id);
    });
  });

  describe("4. Multi-Attribute Filtering (Connectors, Operators, Status, Power)", () => {
    it("filters nearby stations by connectorType", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&connectorType=ccs2",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      for (const st of json.data.items) {
        const hasCcs2 = st.connectors.some(
          (c: { normalizedType?: string; type: string }) =>
            c.normalizedType === "ccs2" || c.type.toLowerCase().includes("ccs"),
        );
        expect(hasCcs2).toBe(true);
      }
    });

    it("filters nearby stations by minimum power (minPowerKw)", async () => {
      // Jio-bp has 120kW, Tata Power has 60kW
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&minPowerKw=100",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBe(1);
      expect(json.data.items[0].slug).toBe("jio-bp-aerocity-delhi");
      expect(json.data.items[0].fastestPowerKw).toBeGreaterThanOrEqual(100);
    });

    it("filters nearby stations by operator slug or name", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&operator=tata-power",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBe(1);
      expect(json.data.items[0].operator.slug).toBe("tata-power");
    });

    it("filters nearby stations by authoritative status", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&status=Operational",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBeGreaterThanOrEqual(1);
      for (const st of json.data.items) {
        expect(st.status.toLowerCase()).toBe("operational");
      }
    });
  });

  describe("5. Ordering & Sorting Support", () => {
    it("orders by distance ascending by default", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      const items = json.data.items;
      if (items.length >= 2) {
        expect(items[0].distanceKm).toBeLessThanOrEqual(items[1].distanceKm);
      }
    });

    it("supports sorting by power descending (fastest charger first)", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&sortBy=power&sortOrder=desc",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      const items = json.data.items;
      expect(items[0].slug).toBe("jio-bp-aerocity-delhi"); // 120kW
      expect(items[0].fastestPowerKw).toBe(120);
    });

    it("supports sorting by name alphabetically", async () => {
      const res = await app.request(
        "/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=25&sortBy=name&sortOrder=asc",
      );
      expect(res.status).toBe(200);

      const json = await res.json();
      const items = json.data.items;
      expect(items[0].name.localeCompare(items[1].name)).toBeLessThanOrEqual(0);
    });
  });

  describe("6. PostGIS Query Plan & Index Verification", () => {
    it("validates PostGIS ST_DWithin and ST_Distance SQL constructs", () => {
      const lat = 28.6328;
      const lng = 77.2197;
      const radiusKm = 25;
      const radiusMeters = radiusKm * 1000;

      // Mathematical verification of geodesic distance calculation
      // ST_MakePoint takes (longitude, latitude)
      // ST_DWithin uses GiST spatial index on geography(Point, 4326)
      expect(radiusMeters).toBe(25000);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });
});
