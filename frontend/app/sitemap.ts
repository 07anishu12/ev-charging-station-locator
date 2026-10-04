import type { MetadataRoute } from "next";

import { CANONICAL_CITIES, CANONICAL_PINCODES, CANONICAL_STATES } from "@fastcharger/shared";
import { apiClient } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo/config";
import { routeUrls } from "@/lib/utils/url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  // 1. Root static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl(routeUrls.home()),
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: absoluteUrl(routeUrls.india()),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl(routeUrls.map()),
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 2. States routes
  const stateRoutes: MetadataRoute.Sitemap = CANONICAL_STATES.map((state) => ({
    url: absoluteUrl(routeUrls.state(state.slug)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. City routes from backend (with canonical cities fallback for offline SSG/sitemap generation)
  const citiesData = await apiClient.getCities({ pageSize: 100 });
  const citiesList =
    citiesData.items.length > 0
      ? citiesData.items.map((c) => ({ stateSlug: c.stateSlug || "india", slug: c.slug }))
      : CANONICAL_CITIES.map((c) => ({ stateSlug: c.stateSlug, slug: c.canonicalSlug }));

  const cityRoutes: MetadataRoute.Sitemap = citiesList.map((city) => ({
    url: absoluteUrl(routeUrls.city(city.stateSlug || "india", city.slug)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 4. Curated Canonical PIN code routes (major urban & transit hubs)
  const pinRoutes: MetadataRoute.Sitemap = Object.values(CANONICAL_PINCODES).map((pin) => ({
    url: absoluteUrl(routeUrls.pincode(pin.stateSlug, pin.citySlug, pin.pincode)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // 5. Charging Station detail routes from backend (with fallback for offline build)
  const stationsData = await apiClient.getStations({ pageSize: 100 });
  const stationSlugs =
    stationsData.items.length > 0
      ? stationsData.items.map((s) => s.slug)
      : [
          "tata-power-ez-charge-dlf-cyber-hub-gurugram",
          "zeon-charging-phoenix-marketcity-bengaluru",
          "jio-bp-pulse-bandra-kurla-complex-mumbai",
          "statiq-charging-station-aerocity-new-delhi",
          "ather-grid-indiranagar-bengaluru",
        ];

  const stationRoutes: MetadataRoute.Sitemap = stationSlugs.map((slug) => ({
    url: absoluteUrl(routeUrls.station(slug)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...stateRoutes,
    ...cityRoutes,
    ...pinRoutes,
    ...stationRoutes,
  ];
}

