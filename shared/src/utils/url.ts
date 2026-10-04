function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export const routeUrls = {
  home: () => "/",
  explore: () => "/explore",
  india: () => "/india",
  state: (state: string) => `/india/${encodeSegment(state)}`,
  city: (state: string, city: string) =>
    `/india/${encodeSegment(state)}/${encodeSegment(city)}/ev-charging-stations`,
  pincode: (state: string, city: string, pincode: string) =>
    `/india/${encodeSegment(state)}/${encodeSegment(city)}/${encodeSegment(pincode)}/ev-charging-stations`,
  station: (slug: string) => `/station/${encodeSegment(slug)}`,
  map: (query?: { lat?: number; lng?: number; nearby?: boolean }) => {
    if (!query) return "/map";
    const params = new URLSearchParams();
    if (query.lat !== undefined) params.set("lat", String(query.lat));
    if (query.lng !== undefined) params.set("lng", String(query.lng));
    if (query.nearby) params.set("nearby", "true");
    const qs = params.toString();
    return qs ? `/map?${qs}` : "/map";
  },
  search: (query?: string) => (query ? `/search?q=${encodeURIComponent(query)}` : "/search"),
  saved: () => "/saved",
} as const;

export const apiUrls = {
  stations: () => "/api/stations",
  nearbyStations: () => "/api/stations/nearby",
  station: (id: string) => `/api/stations/${encodeSegment(id)}`,
  cities: () => "/api/cities",
  city: (slug: string) => `/api/cities/${encodeSegment(slug)}`,
  search: () => "/api/search",
  pincode: (pincode: string) => `/api/pincodes/${encodeSegment(pincode)}`,
} as const;
