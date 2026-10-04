import { describe, expect, it } from "vitest";

import {
  auditStationQuality,
  calculateDistanceMeters,
  DATA_QUALITY_ISSUE_TYPES,
  districts,
  generateDeterministicStationSlug,
  isProximityDuplicate,
  isValidCoordinate,
  localities,
  normalizeCoordinate,
  stationProviderMappings,
  stations,
  validateIndianPincode,
} from "@fastcharger/database";

describe("PostgreSQL/PostGIS Canonical Data Ownership", () => {
  describe("Station Identity & Multi-Provider De-duplication", () => {
    it("generates deterministic station slugs across repeated provider syncs", () => {
      const slug1 = generateDeterministicStationSlug({
        name: "Tata Power Fast Charger",
        cityOrDistrict: "Indiranagar",
        providerName: "ocm",
        providerStationId: 104231,
      });

      const slug2 = generateDeterministicStationSlug({
        name: "Tata Power Fast Charger",
        cityOrDistrict: "Indiranagar",
        providerName: "ocm",
        providerStationId: 104231,
      });

      expect(slug1).toBe("tata-power-fast-charger-indiranagar-ocm-104231");
      expect(slug1).toBe(slug2);
    });

    it("generates deterministic grid-based slugs when upstream provider IDs are absent", () => {
      const slug1 = generateDeterministicStationSlug({
        name: "Ather Grid Station",
        cityOrDistrict: "Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const slug2 = generateDeterministicStationSlug({
        name: "Ather Grid Station",
        cityOrDistrict: "Bengaluru",
        latitude: 12.9716,
        longitude: 77.5946,
      });

      expect(slug1).toBe("ather-grid-station-bengaluru-g129716-775946");
      expect(slug1).toBe(slug2);
    });

    it("detects cross-provider proximity duplicates within 25 meters when operators match", () => {
      const stationA = {
        latitude: 12.9715987,
        longitude: 77.5945662,
        name: "Statiq Charging Hub",
        operatorSlug: "statiq",
      };

      const stationB = {
        latitude: 12.9716201, // ~3.5 meters away
        longitude: 77.5945801,
        name: "Statiq EV Station MG Road",
        operatorSlug: "statiq",
      };

      expect(isProximityDuplicate(stationA, stationB, 25)).toBe(true);
    });

    it("does not flag stations as duplicates when separated by significant distance", () => {
      const stationA = {
        latitude: 12.9716,
        longitude: 77.5946,
        name: "Indiranagar Charger",
        operatorSlug: "tata-power",
      };

      const stationB = {
        latitude: 12.978, // ~710 meters away
        longitude: 77.599,
        name: "Indiranagar Charger 2",
        operatorSlug: "tata-power",
      };

      expect(isProximityDuplicate(stationA, stationB, 25)).toBe(false);
    });

    it("normalizes coordinates to 4 decimal places (~11m resolution)", () => {
      expect(normalizeCoordinate(12.9715987)).toBe(12.9716);
      expect(normalizeCoordinate(77.5945662)).toBe(77.5946);
    });
  });

  describe("PostGIS Geodesic Spatial Calculations", () => {
    it("accurately computes geodesic distance matching PostGIS ST_Distance", () => {
      // Distance between Vidhana Soudha and MG Road Bengaluru (~2.1 km)
      const distance = calculateDistanceMeters(12.9797, 77.5907, 12.9749, 77.6095);
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(2300);
    });

    it("validates latitude and longitude bounding constraints strictly", () => {
      expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(false); // Null island rejected
      expect(isValidCoordinate(95.0, 77.0)).toBe(false); // Lat out of bounds
      expect(isValidCoordinate(12.0, 185.0)).toBe(false); // Lng out of bounds
      expect(isValidCoordinate(NaN, 77.0)).toBe(false);
      expect(isValidCoordinate(undefined, 77.0)).toBe(false);
    });

    it("validates 6-digit Indian PIN codes strictly", () => {
      expect(validateIndianPincode("560001")).toEqual({ valid: true, cleaned: "560001" });
      expect(validateIndianPincode(" 110 001 ")).toEqual({ valid: true, cleaned: "110001" });
      expect(validateIndianPincode("12345")).toEqual({ valid: false, cleaned: null });
      expect(validateIndianPincode("ABCDEF")).toEqual({ valid: false, cleaned: null });
    });
  });

  describe("Data Quality Audit & Anomaly Tracking", () => {
    it("flags invalid coordinates as error and does not drop records silently", () => {
      const issues = auditStationQuality({
        latitude: 999,
        longitude: 999,
        name: "Test Station",
        city: "Bengaluru",
      });

      expect(issues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.INVALID_COORDINATES)).toBe(true);
      const coordIssue = issues.find((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.INVALID_COORDINATES);
      expect(coordIssue?.severity).toBe("error");
    });

    it("flags invalid pincodes as warning", () => {
      const issues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        pincode: "INVALID",
        name: "Test Station",
        city: "Bengaluru",
      });

      expect(issues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.INVALID_PINCODE)).toBe(true);
      const pinIssue = issues.find((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.INVALID_PINCODE);
      expect(pinIssue?.severity).toBe("warning");
    });

    it("flags missing and ambiguous cities", () => {
      const missingCityIssues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        name: "Highway Hub",
      });
      expect(missingCityIssues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.MISSING_CITY)).toBe(true);

      const ambiguousCityIssues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        name: "Metro Hub",
        city: "Unknown Cantonment",
        isAmbiguousCity: true,
      });
      expect(ambiguousCityIssues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.AMBIGUOUS_CITY)).toBe(true);
    });

    it("flags duplicate upstream provider records with error severity", () => {
      const issues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        name: "Duplicate Charger",
        city: "Mumbai",
        isDuplicateProviderRecord: true,
        duplicateProviderKey: "ocm-12345",
      });

      expect(issues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.DUPLICATE_PROVIDER_RECORD)).toBe(true);
      const dupIssue = issues.find((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.DUPLICATE_PROVIDER_RECORD);
      expect(dupIssue?.severity).toBe("error");
      expect(dupIssue?.details?.duplicateProviderKey).toBe("ocm-12345");
    });

    it("flags malformed connectors with missing types or negative power capacities", () => {
      const issues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        name: "Broken Connector Hub",
        city: "Delhi",
        connectors: [
          { type: "ccs2", powerKw: 60, status: "operational" },
          { type: "unknown", powerKw: -10, status: "unknown" },
        ],
      });

      expect(issues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.MALFORMED_CONNECTOR)).toBe(true);
    });

    it("flags unrecognized station status values", () => {
      const issues = auditStationQuality({
        latitude: 12.97,
        longitude: 77.59,
        name: "Status Test Hub",
        city: "Chennai",
        status: "half_broken_sometimes_works",
      });

      expect(issues.some((i) => i.issueType === DATA_QUALITY_ISSUE_TYPES.INVALID_STATUS)).toBe(true);
    });
  });

  describe("Canonical Entity Schema Definitions", () => {
    it("verifies districts table columns and relations", () => {
      expect(districts.id).toBeDefined();
      expect(districts.name).toBeDefined();
      expect(districts.slug).toBeDefined();
      expect(districts.stateId).toBeDefined();
    });

    it("verifies localities table columns and spatial location", () => {
      expect(localities.id).toBeDefined();
      expect(localities.name).toBeDefined();
      expect(localities.slug).toBeDefined();
      expect(localities.cityId).toBeDefined();
      expect(localities.location).toBeDefined();
      expect(localities.stationCount).toBeDefined();
    });

    it("verifies station_provider_mappings table for multi-provider identity persistence", () => {
      expect(stationProviderMappings.id).toBeDefined();
      expect(stationProviderMappings.stationId).toBeDefined();
      expect(stationProviderMappings.providerName).toBeDefined();
      expect(stationProviderMappings.providerStationId).toBeDefined();
      expect(stationProviderMappings.rawData).toBeDefined();
    });

    it("verifies stations table verification_status column and spatial location", () => {
      expect(stations.verificationStatus).toBeDefined();
      expect(stations.location).toBeDefined();
    });
  });
});
