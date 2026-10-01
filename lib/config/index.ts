import "server-only";

import { env } from "./env";
import { configDefaults } from "./defaults";

export const appConfig = {
  ...configDefaults,
  siteUrl: env.siteUrl,
  database: {
    url: env.databaseUrl,
    configured: Boolean(env.databaseUrl),
  },
  providers: {
    openChargeMap: {
      name: "open-charge-map",
      apiKey: env.openChargeMapApiKey,
      baseUrl: "https://api.openchargemap.io/v3/poi",
    },
  },
  map: {
    provider: "leaflet" as const,
    defaultCenter: { latitude: 20.5937, longitude: 78.9629 },
    defaultZoom: 5,
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
  seo: {
    siteName: "FastCharger",
    tagline: "Find your next charging stop.",
    defaultDescription: "Find EV charging stations across India.",
  },
} as const;
