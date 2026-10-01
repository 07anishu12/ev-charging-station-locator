import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildFAQSchema,
  buildStationSchema,
  buildWebSiteSchema,
} from "@/components/seo/json-ld";
import { getMockStations } from "@/lib/mock";
import { absoluteUrl, SITE_URL } from "@/lib/seo/config";

describe("SEO / AEO / GEO Foundation Test Suite", () => {
  describe("Canonical URL helper", () => {
    it("generates correct absolute canonical URLs", () => {
      expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
      expect(absoluteUrl("/india")).toBe(`${SITE_URL}/india`);
      expect(absoluteUrl("india/delhi")).toBe(`${SITE_URL}/india/delhi`);
      expect(absoluteUrl("/station/tata-power-aerocity")).toBe(
        `${SITE_URL}/station/tata-power-aerocity`,
      );
    });
  });

  describe("robots.txt configuration", () => {
    it("allows public discovery pages and disallows internal/debug routes", () => {
      const robotsConfig = robots();
      expect(robotsConfig.rules).toBeDefined();

      const rule = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
      expect(rule.allow).toBe("/");
      expect(rule.disallow).toContain("/api/");
      expect(rule.disallow).toContain("/search");
      expect(rule.disallow).toContain("/saved");
      expect(rule.disallow).toContain("/admin");

      expect(robotsConfig.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    });
  });

  describe("sitemap.xml configuration", () => {
    it("generates a comprehensive, valid sitemap of real entities", async () => {
      const entries = await sitemap();
      expect(entries.length).toBeGreaterThanOrEqual(30);

      const urls = entries.map((e) => e.url);

      // Check root pages
      expect(urls).toContain(absoluteUrl("/"));
      expect(urls).toContain(absoluteUrl("/india"));
      expect(urls).toContain(absoluteUrl("/map"));

      // Check state pages
      expect(urls.some((u) => u.includes("/india/delhi"))).toBe(true);
      expect(urls.some((u) => u.includes("/india/maharashtra"))).toBe(true);

      // Check city pages
      expect(urls.some((u) => u.includes("/delhi/ev-charging-stations"))).toBe(true);
      expect(urls.some((u) => u.includes("/mumbai/ev-charging-stations"))).toBe(true);

      // Check PIN pages
      expect(urls.some((u) => u.includes("/110001/ev-charging-stations"))).toBe(true);

      // Check station pages
      expect(urls.some((u) => u.includes("/station/"))).toBe(true);

      // Validate priority ranges
      expect(entries.every((e) => e.priority !== undefined && e.priority >= 0.5 && e.priority <= 1.0)).toBe(true);
    });
  });

  describe("JSON-LD Schema generators", () => {
    it("builds WebSite schema with SearchAction", () => {
      const schema = buildWebSiteSchema();
      expect(schema["@type"]).toBe("WebSite");
      expect(schema.name).toBe("FastCharger");
      expect(schema.url).toBe(SITE_URL);
      expect(schema.potentialAction).toBeDefined();
    });

    it("builds BreadcrumbList schema with sequential positions", () => {
      const schema = buildBreadcrumbSchema([
        { name: "India", path: "/india" },
        { name: "Delhi", path: "/india/delhi" },
        { name: "Connaught Place" },
      ]);
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[0].name).toBe("India");
      expect(schema.itemListElement[0].item).toBe(`${SITE_URL}/india`);
      expect(schema.itemListElement[2].item).toBeUndefined(); // current page
    });

    it("builds FAQPage schema for Answer Engine Optimization", () => {
      const schema = buildFAQSchema([
        {
          question: "How many chargers are near 110001?",
          answer: "There are 8 public chargers within 5km.",
        },
      ]);
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(1);
      expect(schema.mainEntity[0].name).toBe("How many chargers are near 110001?");
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe("There are 8 public chargers within 5km.");
    });

    it("builds ElectricVehicleChargingStation schema with factual specifications", () => {
      const station = getMockStations()[0];
      const schema = buildStationSchema(station, `/station/${station.slug}`);

      expect(schema["@type"]).toContain("ElectricVehicleChargingStation");
      expect(schema.name).toBe(station.name);
      expect(schema.address).toBeDefined();
      expect((schema.address as Record<string, unknown>).streetAddress).toBe(station.address);
      expect((schema.geo as Record<string, unknown>).latitude).toBe(station.latitude);
      expect((schema.geo as Record<string, unknown>).longitude).toBe(station.longitude);
      expect((schema.provider as Record<string, unknown>).name).toBe(station.operator.name);
      expect(schema.maximumPowerOutput).toBe(`${station.fastestPowerKw} kW`);
    });

    it("builds CollectionPage schema for regional hubs", () => {
      const schema = buildCollectionPageSchema({
        title: "EV Charging Stations in Delhi",
        description: "Delhi EV charging corridor",
        url: "/india/delhi/delhi/ev-charging-stations",
        itemCount: 42,
      });
      expect(schema["@type"]).toBe("CollectionPage");
      expect(schema.name).toBe("EV Charging Stations in Delhi");
      expect(schema.numberOfItems).toBe(42);
      expect(schema.url).toBe(`${SITE_URL}/india/delhi/delhi/ev-charging-stations`);
    });
  });

  describe("Page Metadata & Canonical URL verification", () => {
    it("verifies root layout defines metadataBase and Open Graph defaults", () => {
      const layoutContent = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf-8");
      expect(layoutContent).toContain("metadataBase: new URL(SITE_URL)");
      expect(layoutContent).toContain("canonical: \"./\"");
      expect(layoutContent).toContain("openGraph:");
      expect(layoutContent).toContain("twitter:");
    });

    it("verifies indexability rules on map, search, and saved pages", () => {
      const mapLayout = fs.readFileSync(path.join(process.cwd(), "app/map/layout.tsx"), "utf-8");
      expect(mapLayout).toContain("index: true");
      expect(mapLayout).toContain("canonical: absoluteUrl(\"/map\")");

      const searchLayout = fs.readFileSync(path.join(process.cwd(), "app/search/layout.tsx"), "utf-8");
      expect(searchLayout).toContain("index: false");
      expect(searchLayout).toContain("follow: true");

      const savedLayout = fs.readFileSync(path.join(process.cwd(), "app/saved/layout.tsx"), "utf-8");
      expect(savedLayout).toContain("index: false");
      expect(savedLayout).toContain("follow: false");
    });

    it("verifies StationPage exposes GEO machine-readable specifications and AEO FAQs", () => {
      const stationPage = fs.readFileSync(path.join(process.cwd(), "app/station/[slug]/page.tsx"), "utf-8");
      expect(stationPage).toContain("generateMetadata");
      expect(stationPage).toContain("buildStationSchema");
      expect(stationPage).toContain("Machine-Readable Specifications for");
      expect(stationPage).toContain("<dl");
      expect(stationPage).toContain("Frequently Asked Questions about");
    });

    it("verifies City and PIN pages expose canonical URLs and FAQ sections", () => {
      const cityPage = fs.readFileSync(
        path.join(process.cwd(), "app/india/[state]/[city]/ev-charging-stations/page.tsx"),
        "utf-8",
      );
      expect(cityPage).toContain("canonical: absoluteUrl(canonicalPath)");
      expect(cityPage).toContain("buildFAQSchema");
      expect(cityPage).toContain("Frequently Asked Questions about EV Charging in");

      const pinPage = fs.readFileSync(
        path.join(process.cwd(), "app/india/[state]/[city]/[pincode]/ev-charging-stations/page.tsx"),
        "utf-8",
      );
      expect(pinPage).toContain("canonical: absoluteUrl(canonicalPath)");
      expect(pinPage).toContain("buildFAQSchema");
      expect(pinPage).toContain("Frequently Asked Questions for PIN");
    });
  });
});
