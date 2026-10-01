function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export const routeUrls = {
  home: () => "/",
  india: () => "/india",
  state: (state: string) => `/india/${encodeSegment(state)}`,
  city: (state: string, city: string) =>
    `/india/${encodeSegment(state)}/${encodeSegment(city)}/ev-charging-stations`,
  pincode: (state: string, city: string, pincode: string) =>
    `/india/${encodeSegment(state)}/${encodeSegment(city)}/${encodeSegment(pincode)}/ev-charging-stations`,
  station: (slug: string) => `/station/${encodeSegment(slug)}`,
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
