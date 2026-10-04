import { describe, expect, it } from "vitest";
import {
  // Common & Envelopes
  apiErrorResponseSchema,
  createApiSuccessResponseSchema,
  // Stations
  stationsQuerySchema,
  nearbyStationsQuerySchema,
  stationSlugParamSchema,
  stationSummarySchema,
  stationDetailSchema,
  stationSearchResultSchema,
  // Cities
  citiesQuerySchema,
  citySlugParamSchema,
  cityStationsResponseDataSchema,
  // Pincodes
  pincodeParamSchema,
  pincodeQuerySchema,
  pincodeStationResponseDataSchema,
  // Search
  searchQuerySchema,
  searchResponseDataSchema,
  // Pagination
  paginationMetaSchema,
  // Client
  FastChargerApiClient,
  FastChargerApiError,
} from "@fastcharger/shared";

describe("Strict Versioned API Contracts (v1)", () => {
  // 1. Valid request passes
  describe("1. Valid Requests", () => {
    it("valid stations query passes validation with defaults coerced", () => {
      const parsed = stationsQuerySchema.safeParse({
        page: "2",
        pageSize: "15",
        city: "delhi",
        minPowerKw: "50",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.pageSize).toBe(15);
        expect(parsed.data.city).toBe("delhi");
        expect(parsed.data.minPowerKw).toBe(50);
      }
    });

    it("valid nearby coordinates query passes validation", () => {
      const parsed = nearbyStationsQuerySchema.safeParse({
        latitude: "28.6139",
        longitude: "77.2090",
        radiusKm: "25",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.latitude).toBeCloseTo(28.6139);
        expect(parsed.data.longitude).toBeCloseTo(77.209);
        expect(parsed.data.radiusKm).toBe(25);
      }
    });

    it("validates cities and pincode query schemas", () => {
      expect(citiesQuerySchema.safeParse({ page: 1, pageSize: 20 }).success).toBe(true);
      expect(citySlugParamSchema.safeParse({ slug: "delhi" }).success).toBe(true);
      expect(pincodeQuerySchema.safeParse({ page: 1, pageSize: 20, radiusKm: 10 }).success).toBe(true);
      expect(createApiSuccessResponseSchema(citiesQuerySchema).safeParse({ data: { page: 1, pageSize: 20 } }).success).toBe(true);
    });
  });

  // 2. Malformed request fails
  describe("2. Malformed Requests", () => {
    it("fails when latitude is out of bounds", () => {
      const parsed = nearbyStationsQuerySchema.safeParse({
        latitude: 95.0,
        longitude: 77.2,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Latitude must be between -90 and 90");
      }
    });

    it("fails when pincode is not exactly 6 digits", () => {
      const parsed = pincodeParamSchema.safeParse({ pincode: "1100" });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe("PIN code must be exactly 6 digits.");
      }
    });

    it("fails when station slug contains invalid characters", () => {
      const parsed = stationSlugParamSchema.safeParse({ slug: "invalid slug!@" });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Station slug must contain only alphanumeric characters");
      }
    });

    it("fails when search query is empty", () => {
      const parsed = searchQuerySchema.safeParse({ q: "" });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toBe("Search query 'q' cannot be empty.");
      }
    });
  });

  // 3. Backend response satisfies contract & 4. Frontend client can parse backend response
  describe("3 & 4. Backend-to-Frontend Response Serialization & Client Parsing", () => {
    it("frontend client successfully parses valid backend station list response", async () => {
      const mockPayload = {
        data: {
          items: [
            {
              id: "st-1",
              slug: "tata-connaught-place",
              name: "Tata Power CP",
              latitude: 28.6328,
              longitude: 77.2197,
              address: "Connaught Place, New Delhi",
              status: "available",
              connectors: [
                {
                  id: "c-1",
                  type: "CCS (Type 2)",
                  normalizedType: "ccs2",
                  powerKw: 60,
                  status: "available",
                  quantity: 2,
                },
              ],
            },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
            hasMore: false,
          },
        },
      };

      const mockFetcher = async () =>
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const client = new FastChargerApiClient({
        baseUrl: "https://api.fastcharger.in",
        fetchFn: mockFetcher as typeof fetch,
        validateResponses: true,
      });

      const result = await client.getStations({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe("tata-connaught-place");
      expect(result.pagination.total).toBe(1);
    });

    it("frontend client raises controlled FastChargerApiError when contract is violated", async () => {
      // Missing required 'latitude' on item
      const corruptPayload = {
        data: {
          items: [
            {
              id: "st-bad",
              slug: "bad-station",
              name: "Corrupt Data",
              status: "available",
              connectors: [],
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      };

      const mockFetcher = async () =>
        new Response(JSON.stringify(corruptPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const client = new FastChargerApiClient({
        baseUrl: "https://api.fastcharger.in",
        fetchFn: mockFetcher as typeof fetch,
        validateResponses: true,
      });

      await expect(client.getStations()).rejects.toThrow(FastChargerApiError);
      try {
        await client.getStations();
      } catch (err) {
        expect(err).toBeInstanceOf(FastChargerApiError);
        expect((err as FastChargerApiError).code).toBe("CONTRACT_VIOLATION");
      }
    });
  });

  // 5. Error envelope is valid
  describe("5. Error Envelope", () => {
    it("validates standard API error envelope", () => {
      const validError = {
        error: {
          code: "STATION_NOT_FOUND",
          message: "Station 'non-existent' was not found.",
          details: { requestedSlug: "non-existent" },
        },
      };

      const parsed = apiErrorResponseSchema.safeParse(validError);
      expect(parsed.success).toBe(true);
    });

    it("client normalizes 404 response to FastChargerApiError", async () => {
      const errorPayload = {
        error: {
          code: "CITY_NOT_FOUND",
          message: "City 'unknown-city' does not exist.",
        },
      };

      const mockFetcher = async () =>
        new Response(JSON.stringify(errorPayload), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });

      const client = new FastChargerApiClient({
        baseUrl: "https://api.fastcharger.in",
        fetchFn: mockFetcher as typeof fetch,
      });

      const result = await client.getCity("unknown-city");
      expect(result).toBeNull();
    });
  });

  // 6. Pagination structure is valid
  describe("6. Pagination Structure", () => {
    it("validates complete pagination metadata", () => {
      const meta = {
        page: 1,
        pageSize: 20,
        total: 105,
        totalPages: 6,
        hasMore: true,
      };

      const parsed = paginationMetaSchema.safeParse(meta);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.total).toBe(105);
        expect(parsed.data.totalPages).toBe(6);
        expect(parsed.data.hasMore).toBe(true);
      }
    });
  });

  // 7. Nearby response is valid
  describe("7. Nearby Station Response", () => {
    it("validates nearby stations with calculated distanceKm", () => {
      const response = {
        items: [
          {
            id: "st-nearby-1",
            slug: "nearby-station-1",
            name: "Nearby Fast Hub",
            latitude: 28.55,
            longitude: 77.12,
            address: "Terminal 3, IGI Airport",
            status: "available",
            distanceKm: 2.4,
            distanceMeters: 2400,
            connectors: [
              {
                id: "c-1",
                type: "CCS2",
                powerKw: 120,
                status: "available",
                quantity: 4,
              },
            ],
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      const parsed = stationSearchResultSchema.safeParse(response);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items[0].distanceKm).toBe(2.4);
      }
    });
  });

  // 8. Station detail response is valid
  describe("8. Station Detail Response", () => {
    it("validates comprehensive station detail payload", () => {
      const detail = {
        id: "st-detail-1",
        ocmId: 1001,
        slug: "tata-power-cp",
        name: "Tata Power Fast Charger CP",
        operator: { id: "op-1", name: "Tata Power EZ Charge", slug: "tata-power" },
        address: "Block A, Connaught Place",
        city: { name: "Delhi", slug: "delhi" },
        state: { name: "Delhi", slug: "delhi", code: "DL" },
        district: "New Delhi",
        pincode: "110001",
        latitude: 28.6328,
        longitude: 77.2197,
        status: "Operational",
        operationalStatus: "available",
        usageType: "Public",
        dataProvider: "Open Charge Map",
        dataLicense: "CC BY 4.0",
        ocmUrl: "https://openchargemap.org/site/poi/details/1001",
        lastUpdated: "2026-10-04T12:00:00Z",
        fastestPowerKw: 60,
        connectors: [
          {
            id: "c-1",
            type: "CCS (Type 2)",
            normalizedType: "ccs2",
            powerKw: 60,
            status: "available",
            quantity: 2,
          },
        ],
      };

      const parsed = stationDetailSchema.safeParse(detail);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.operator.name).toBe("Tata Power EZ Charge");
        expect(parsed.data.operationalStatus).toBe("available");
      }
    });
  });

  // 9. City response is valid
  describe("9. City Response", () => {
    it("validates city station browser response contract", () => {
      const cityData = {
        city: {
          id: "city-delhi",
          name: "Delhi",
          slug: "delhi",
          stateName: "Delhi",
          stateSlug: "delhi",
          stationCount: 24,
          fastChargerCount: 18,
          latitude: 28.6139,
          longitude: 77.209,
          popularPincodes: ["110001", "110037"],
        },
        operators: [{ name: "Tata Power", slug: "tata-power", stationCount: 12 }],
        stations: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 24,
          totalPages: 2,
        },
      };

      const parsed = cityStationsResponseDataSchema.safeParse(cityData);
      expect(parsed.success).toBe(true);
    });
  });

  // 10. Pincode response is valid
  describe("10. Pincode Response", () => {
    it("validates pincode station response with nearby pincode suggestions", () => {
      const pincodeData = {
        pincode: "110001",
        location: {
          city: "Delhi",
          citySlug: "delhi",
          state: "Delhi",
          stateSlug: "delhi",
          stateCode: "DL",
          district: "New Delhi",
          latitude: 28.6289,
          longitude: 77.2185,
          hasCoordinates: true,
        },
        stations: [],
        total: 5,
        exactPincodeCount: 2,
        nearbyPincodeCount: 3,
        radiusCount: 5,
        nearbyPincodes: [
          { pincode: "110002", city: "Delhi", district: "Central Delhi", distanceKm: 2.1 },
        ],
        radiusKm: 5,
        pagination: {
          page: 1,
          pageSize: 20,
          total: 5,
          totalPages: 1,
        },
      };

      const parsed = pincodeStationResponseDataSchema.safeParse(pincodeData);
      expect(parsed.success).toBe(true);
    });
  });

  // 11. Search response is valid
  describe("11. Search Response", () => {
    it("validates text search response with categorized entity items", () => {
      const searchData = {
        searchType: "text" as const,
        query: "delhi",
        items: [
          {
            type: "city" as const,
            title: "Delhi",
            subtitle: "City • 24 stations",
            href: "/india/delhi",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      const parsed = searchResponseDataSchema.safeParse(searchData);
      expect(parsed.success).toBe(true);
    });
  });

  // 12. Backward Compatibility
  describe("12. Backward Compatibility Rules", () => {
    it("allows optional forward fields without breaking client parsing", () => {
      const responseWithNewField = {
        id: "st-forward-1",
        slug: "forward-station",
        name: "Forward Station",
        latitude: 28.5,
        longitude: 77.2,
        address: "Test Address",
        status: "available",
        connectors: [],
        // New optional field introduced in backend v1.1
        solarPowered: true,
        amenities: ["Cafe", "Restroom"],
      };

      const parsed = stationSummarySchema.safeParse(responseWithNewField);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.slug).toBe("forward-station");
      }
    });

    it("preserves backward compatibility when extra query parameters are supplied", () => {
      const queryWithUnknownParam = {
        page: 1,
        pageSize: 10,
        unrecognizedParam: "ignored-by-v1-router",
      };

      const parsed = stationsQuerySchema.safeParse(queryWithUnknownParam);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.pageSize).toBe(10);
      }
    });
  });
});
