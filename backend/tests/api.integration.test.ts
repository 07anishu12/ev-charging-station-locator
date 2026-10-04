import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { errorHandler } from "../src/middleware/error-handler";
import { createRateLimiter } from "../src/middleware/rate-limiter";
import { createStationsRouter } from "../src/routes/v1/stations.routes";
import { createCitiesRouter } from "../src/routes/v1/cities.routes";
import { createPincodesRouter } from "../src/routes/v1/pincodes.routes";
import { createSearchRouter } from "../src/routes/v1/search.routes";
import { createHealthRouter } from "../src/routes/health.routes";
import { StationController } from "../src/controllers/station.controller";
import { CityController } from "../src/controllers/city.controller";
import { PincodeController } from "../src/controllers/pincode.controller";
import { SearchController } from "../src/controllers/search.controller";
import { HealthController } from "../src/controllers/health.controller";
import { StationService } from "../src/services/station.service";
import { CityService } from "../src/services/city.service";
import { PincodeService } from "../src/services/pincode.service";
import { SearchService } from "../src/services/search.service";
import {
  FixtureStationRepository,
  FixtureCityRepository,
  FixturePincodeRepository,
  FixtureSearchRepository,
} from "./fixtures/test-repositories";
import type { IStationRepository } from "../src/repositories/station.repository";
import type { ICityRepository } from "../src/repositories/city.repository";

function buildTestApp() {
  const stationRepo = new FixtureStationRepository();
  const cityRepo = new FixtureCityRepository();
  const pincodeRepo = new FixturePincodeRepository();
  const searchRepo = new FixtureSearchRepository();

  const stationService = new StationService(stationRepo, cityRepo);
  const cityService = new CityService(cityRepo);
  const pincodeService = new PincodeService(pincodeRepo, stationRepo);
  const searchService = new SearchService(searchRepo, pincodeService);

  const stationController = new StationController(stationService);
  const cityController = new CityController(cityService, stationService);
  const pincodeController = new PincodeController(pincodeService);
  const searchController = new SearchController(searchService);
  const healthController = new HealthController();

  const app = new Hono();

  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: (origin) => origin || "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );
  app.use("*", bodyLimit({ maxSize: 1024 * 1024 }));
  app.use("/api/*", createRateLimiter({ windowMs: 60 * 1000, maxRequests: 200 }));

  const v1 = new Hono();
  v1.route("/stations", createStationsRouter(stationController));
  v1.route("/cities", createCitiesRouter(cityController));
  v1.route("/pincodes", createPincodesRouter(pincodeController));
  v1.route("/search", createSearchRouter(searchController));

  app.route("/health", createHealthRouter(healthController));
  app.route("/api/v1", v1);

  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: `Endpoint ${c.req.method} ${c.req.path} does not exist.`,
        },
      },
      404,
    );
  });

  app.onError(errorHandler);

  return app;
}

const testApp = buildTestApp();

describe("Backend Standalone API Integration Tests", () => {
  // 1. Health Endpoints
  describe("Health Checks", () => {
    it("returns 200 and process status on GET /health", async () => {
      const res = await testApp.request("/health");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe("ok");
      expect(json.data.service).toBe("fastcharger-api");
      expect(typeof json.data.uptimeSeconds).toBe("number");
      expect(typeof json.data.memoryUsageMb).toBe("number");
    });

    it("handles database health check on GET /health/db", async () => {
      const res = await testApp.request("/health/db");
      expect([200, 503]).toContain(res.status);

      const json = await res.json();
      if (res.status === 200) {
        expect(json.data.status).toBe("ok");
        expect(json.data.database.ok).toBe(true);
      } else {
        expect(json.error.code).toBe("DATABASE_UNHEALTHY");
      }
    });
  });

  // 2. Station Endpoints
  describe("Station Endpoints (/api/v1/stations)", () => {
    it("returns valid station request with 200 on GET /api/v1/stations", async () => {
      const res = await testApp.request("/api/v1/stations?page=1&pageSize=10");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBeGreaterThan(0);
      expect(json.data.pagination).toBeDefined();
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.pageSize).toBe(10);
    });

    it("supports pagination parameters on GET /api/v1/stations", async () => {
      const res = await testApp.request("/api/v1/stations?page=2&pageSize=1");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.pagination.page).toBe(2);
      expect(json.data.pagination.pageSize).toBe(1);
      expect(json.data.items.length).toBe(1);
    });

    it("returns station details for valid slug on GET /api/v1/stations/:slug", async () => {
      const res = await testApp.request("/api/v1/stations/tata-connaught-place-delhi");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.station).toBeDefined();
      expect(json.data.station.slug).toBe("tata-connaught-place-delhi");
      expect(json.data.station.operator.name).toBe("Tata Power EZ Charge");
      expect(json.data.station.connectors.length).toBeGreaterThan(0);
    });

    it("returns 404 for missing station on GET /api/v1/stations/:slug", async () => {
      const res = await testApp.request("/api/v1/stations/definitely-non-existent-station-99999");
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("STATION_NOT_FOUND");
      expect(json.error.message).toContain("definitely-non-existent-station-99999");
    });

    it("returns 400 for invalid station slug with special characters", async () => {
      const res = await testApp.request("/api/v1/stations/invalid%20slug!@#$");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // 3. Nearby Stations & Radius Filtering
  describe("Nearby Station Spatial Search (/api/v1/stations/nearby)", () => {
    it("returns 200 with nearby stations sorted by distance when coordinates provided", async () => {
      // Coordinates near Connaught Place (28.6328, 77.2197)
      const res = await testApp.request("/api/v1/stations/nearby?latitude=28.63&longitude=77.21&radiusKm=20");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBeGreaterThan(0);

      // Verify spatial distance is returned and sorted ascending
      const items = json.data.items;
      expect(items[0].distanceKm).toBeDefined();
      expect(typeof items[0].distanceKm).toBe("number");
      if (items.length > 1) {
        expect(items[0].distanceKm).toBeLessThanOrEqual(items[1].distanceKm);
      }
    });

    it("filters stations strictly by radius (radius filtering)", async () => {
      // 1km radius from CP should find CP station (~0.3km) but exclude Aerocity (~12km) and Bangalore (~1700km)
      const res = await testApp.request("/api/v1/stations/nearby?latitude=28.6328&longitude=77.2197&radiusKm=1");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.items.length).toBe(1);
      expect(json.data.items[0].slug).toBe("tata-connaught-place-delhi");
    });

    it("returns 400 if latitude is missing", async () => {
      const res = await testApp.request("/api/v1/stations/nearby?longitude=77.2090");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Latitude is required");
    });

    it("returns 400 if longitude is out of range", async () => {
      const res = await testApp.request("/api/v1/stations/nearby?latitude=28.6139&longitude=250");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("Longitude must be between -180 and 180");
    });

    it("returns 400 if radiusKm is negative", async () => {
      const res = await testApp.request("/api/v1/stations/nearby?latitude=28.6139&longitude=77.2090&radiusKm=-5");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // 4. Cities
  describe("City Endpoints (/api/v1/cities)", () => {
    it("returns paginated city list on GET /api/v1/cities", async () => {
      const res = await testApp.request("/api/v1/cities?page=1&pageSize=10");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBeGreaterThan(0);
    });

    it("returns city detail and stations on GET /api/v1/cities/:slug", async () => {
      const res = await testApp.request("/api/v1/cities/delhi");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.city).toBeDefined();
      expect(json.data.city.slug).toBe("delhi");
      expect(Array.isArray(json.data.stations)).toBe(true);
      expect(json.data.stations.length).toBe(2);
    });

    it("returns 404 for missing city on GET /api/v1/cities/:slug", async () => {
      const res = await testApp.request("/api/v1/cities/non-existent-city-999");
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("CITY_NOT_FOUND");
    });
  });

  // 5. Pincodes
  describe("Pincode Endpoints (/api/v1/pincodes)", () => {
    it("returns pincode station data for valid PIN code", async () => {
      const res = await testApp.request("/api/v1/pincodes/110001?radiusKm=10");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.pincode).toBe("110001");
      expect(json.data.location).toBeDefined();
      expect(json.data.location.latitude).toBeCloseTo(28.6289, 2);
      expect(json.data.location.longitude).toBeCloseTo(77.2185, 2);
      expect(Array.isArray(json.data.stations)).toBe(true);
    });

    it("returns 400 for malformed PIN code (less than 6 digits)", async () => {
      const res = await testApp.request("/api/v1/pincodes/1234");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(JSON.stringify(json.error)).toContain("PIN code must be exactly 6 digits");
    });

    it("returns 400 for malformed PIN code (non-numeric)", async () => {
      const res = await testApp.request("/api/v1/pincodes/11000A");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for unknown PIN code", async () => {
      const res = await testApp.request("/api/v1/pincodes/999999");
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("PINCODE_NOT_FOUND");
    });
  });

  // 6. Search
  describe("Search Endpoint (/api/v1/search)", () => {
    it("handles text search on GET /api/v1/search?q=delhi", async () => {
      const res = await testApp.request("/api/v1/search?q=delhi");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.searchType).toBe("text");
      expect(json.data.query).toBe("delhi");
      expect(json.data.categorized).toBeDefined();
      expect(json.data.categorized.cities.length).toBeGreaterThan(0);
    });

    it("handles 6-digit PIN code query on GET /api/v1/search?q=110001", async () => {
      const res = await testApp.request("/api/v1/search?q=110001");
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.searchType).toBe("pincode");
      expect(json.data.pincode).toBe("110001");
    });

    it("returns 400 for empty search query", async () => {
      const res = await testApp.request("/api/v1/search?q=");
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // 7. Security, Error Handling, and Database Failure
  describe("Security & Error Masking", () => {
    it("includes security headers in responses", async () => {
      const res = await testApp.request("/health");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    });

    it("returns 404 for unknown endpoints", async () => {
      const res = await testApp.request("/api/v1/unsupported-endpoint");
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("masks database URLs, passwords, and SQL statements during failure handling", async () => {
      const failingRepo: IStationRepository = {
        async findByIdOrSlug() {
          throw new Error("connection to postgresql://admin:secretpassword123@db.example.com:5432/fastcharger failed: SELECT * FROM secret_table");
        },
        async findList() {
          throw new Error("SELECT * FROM stations WHERE fail = true");
        },
        async findNearby() {
          throw new Error("SELECT * FROM stations WHERE fail = true");
        },
      };

      const mockCityRepo: ICityRepository = {
        async findAll() { return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
        async findBySlug() { return null; },
      };

      const failingService = new StationService(failingRepo, mockCityRepo);
      const failingController = new StationController(failingService);
      const testRouter = createStationsRouter(failingController);

      const failureApp = new Hono();
      failureApp.route("/api/v1/stations", testRouter);
      failureApp.onError(errorHandler);

      const res = await failureApp.request("/api/v1/stations/test-slug");
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe("INTERNAL_SERVER_ERROR");
      // Verify sensitive tokens are strictly masked
      expect(JSON.stringify(json)).not.toContain("secretpassword123");
      expect(JSON.stringify(json)).not.toContain("SELECT * FROM");
      expect(JSON.stringify(json)).toContain("Database operation failed");
    });
  });
});
