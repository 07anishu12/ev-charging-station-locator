import type { MetadataRoute } from "next";

import { CANONICAL_PINCODES } from "@/lib/geo/canonical-pincodes";
import { getMockCities, getMockStates, getMockStations } from "@/lib/mock";
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
  const states = getMockStates();
  const stateRoutes: MetadataRoute.Sitemap = states.map((state) => ({
    url: absoluteUrl(routeUrls.state(state.slug)),
    lastModified,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. City routes
  const cities = getMockCities();
  const cityRoutes: MetadataRoute.Sitemap = cities.map((city) => ({
    url: absoluteUrl(routeUrls.city(city.stateSlug, city.slug)),
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

  // 5. Charging Station detail routes
  const stations = getMockStations();
  const stationRoutes: MetadataRoute.Sitemap = stations.map((station) => ({
    url: absoluteUrl(routeUrls.station(station.slug)),
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
