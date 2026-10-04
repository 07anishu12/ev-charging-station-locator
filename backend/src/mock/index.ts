import { CANONICAL_PINCODES } from "@fastcharger/shared";
import { distanceInKilometers } from "@fastcharger/shared";
import {
  MOCK_CITIES,
  MOCK_OPERATORS,
  MOCK_STATES,
  MOCK_STATIONS,
  type MockCity,
  type MockOperator,
  type MockState,
  type MockStation,
} from "./data";

export interface StationFilter {
  query?: string;
  citySlug?: string;
  stateSlug?: string;
  operatorSlug?: string;
  minPowerKw?: number;
  connectorType?: string;
  operationalOnly?: boolean;
}

export function getMockStates(): MockState[] {
  return [...MOCK_STATES];
}

export function getMockStateBySlug(slug: string): MockState | null {
  const normalized = slug.toLowerCase().trim();
  return MOCK_STATES.find((s) => s.slug === normalized) ?? null;
}

export function getMockCities(stateSlug?: string): MockCity[] {
  if (!stateSlug) return [...MOCK_CITIES];
  const normalized = stateSlug.toLowerCase().trim();
  return MOCK_CITIES.filter((c) => c.stateSlug === normalized);
}

export function getMockCityBySlug(slug: string): MockCity | null {
  const normalized = slug.toLowerCase().trim();
  return MOCK_CITIES.find((c) => c.slug === normalized) ?? null;
}

export function getMockOperators(): MockOperator[] {
  return [...MOCK_OPERATORS];
}

export function getMockStationBySlug(slug: string): MockStation | null {
  const normalized = slug.toLowerCase().trim();
  return MOCK_STATIONS.find((s) => s.slug === normalized) ?? null;
}

export function getMockStationsByState(stateSlug: string): MockStation[] {
  return getMockStations({ stateSlug });
}

export function getMockStationsByCity(citySlug: string): MockStation[] {
  return getMockStations({ citySlug });
}

export function getMockStations(filter: StationFilter = {}): MockStation[] {
  let result = [...MOCK_STATIONS];

  if (filter.citySlug) {
    const slug = filter.citySlug.toLowerCase().trim();
    result = result.filter((s) => s.city.slug === slug);
  }

  if (filter.stateSlug) {
    const slug = filter.stateSlug.toLowerCase().trim();
    result = result.filter((s) => s.state.slug === slug);
  }

  if (filter.operatorSlug) {
    const slug = filter.operatorSlug.toLowerCase().trim();
    result = result.filter((s) => s.operator.slug === slug);
  }

  if (filter.minPowerKw) {
    result = result.filter((s) => s.fastestPowerKw >= filter.minPowerKw!);
  }

  if (filter.connectorType) {
    const type = filter.connectorType.toLowerCase().trim();
    result = result.filter((s) =>
      s.connectors.some(
        (c) =>
          c.normalizedType === type ||
          c.type.toLowerCase().includes(type),
      ),
    );
  }

  if (filter.operationalOnly) {
    result = result.filter((s) => s.status === "Operational");
  }

  if (filter.query) {
    const q = filter.query.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.name.toLowerCase().includes(q) ||
        s.operator.name.toLowerCase().includes(q) ||
        s.pincode.includes(q),
    );
  }

  return result;
}

export function getMockNearbyStations(
  latitude: number,
  longitude: number,
  radiusKm = 25,
): MockStation[] {
  return MOCK_STATIONS.map((station) => {
    const distance = distanceInKilometers(
      { latitude, longitude },
      { latitude: station.latitude, longitude: station.longitude },
    );
    return {
      ...station,
      distanceKm: Math.round(distance * 10) / 10,
    };
  })
    .filter((s) => (s.distanceKm ?? 0) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

export function getMockStationsByPincode(
  pincode: string,
  radiusKm = 25,
): { stationList: MockStation[]; targetCity: string | null; targetState: string | null } {
  const directMatches = MOCK_STATIONS.filter((s) => s.pincode === pincode);

  if (directMatches.length > 0) {
    const first = directMatches[0];
    const withDistance = getMockNearbyStations(first.latitude, first.longitude, radiusKm);
    return {
      stationList: withDistance,
      targetCity: first.city.name,
      targetState: first.state.name,
    };
  }

  // Fallback to checking popular cities if pincode prefix matches
  const sampleCity = MOCK_CITIES.find((c) => c.popularPincodes.includes(pincode)) ?? MOCK_CITIES[0];
  const withDistance = getMockNearbyStations(sampleCity.latitude, sampleCity.longitude, radiusKm);
  return {
    stationList: withDistance,
    targetCity: sampleCity.name,
    targetState: sampleCity.stateName,
  };
}

export function getMockStats() {
  const totalStations = MOCK_STATES.reduce((acc, s) => acc + s.stationCount, 0);
  const totalCities = MOCK_CITIES.length;
  const totalStates = MOCK_STATES.length;
  const totalOperators = MOCK_OPERATORS.length;

  return {
    totalStations,
    totalCities,
    totalStates,
    totalOperators,
  };
}

export interface SearchEntityResult {
  type: "city" | "station" | "operator" | "pincode";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
}

export const GENERIC_CHARGING_WORDS = new Set([
  "charger",
  "chargers",
  "charging",
  "charge",
  "station",
  "stations",
  "ev",
  "fast",
  "electric",
  "point",
  "points",
  "hub",
  "hubs",
  "locator",
  "find",
]);

export function isGenericChargingIntent(query: string): boolean {
  const normalized = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((token) => GENERIC_CHARGING_WORDS.has(token));
}

export function searchMockEntities(rawQuery: string): SearchEntityResult[] {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return [];

  // Check if query is purely a generic charging intent (e.g. "charger", "chargers", "ev station", "charging station")
  if (isGenericChargingIntent(q)) {
    const results: SearchEntityResult[] = [];

    // 1. Featured Fast DC Charging Stations (50kW+)
    const featuredStations = MOCK_STATIONS.filter(
      (s) => s.status === "Operational" && s.fastestPowerKw >= 50,
    ).slice(0, 8);

    for (const station of featuredStations) {
      results.push({
        type: "station",
        title: station.name,
        subtitle: `${station.address} · ⚡ ${station.fastestPowerKw}kW Fast DC`,
        href: `/station/${station.slug}`,
        badge: station.operator.name,
      });
    }

    // 2. Top Charging Networks
    for (const op of MOCK_OPERATORS.slice(0, 4)) {
      results.push({
        type: "operator",
        title: op.name,
        subtitle: `Charging network · ${op.stationCount}+ points across India`,
        href: `/map?operator=${op.slug}`,
        badge: "Network",
      });
    }

    // 3. Top Charging Cities
    for (const city of MOCK_CITIES.slice(0, 4)) {
      results.push({
        type: "city",
        title: city.name,
        subtitle: `${city.stateName} · ${city.stationCount} charging stations`,
        href: `/india/${city.stateSlug}/${city.slug}/ev-charging-stations`,
        badge: "City Hub",
      });
    }

    return results;
  }

  // If query contains a mix of generic words and specific words (e.g. "delhi charger", "tata station"),
  // also extract specific tokens for targeted search
  const normalizedTokens = q.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const specificTokens = normalizedTokens.filter((token) => !GENERIC_CHARGING_WORDS.has(token));
  const effectiveTerm = specificTokens.length > 0 ? specificTokens.join(" ") : q;

  const results: SearchEntityResult[] = [];

  // Match PIN codes
  if (/^\d+$/.test(q) || /^\d+$/.test(effectiveTerm)) {
    const pinTerm = /^\d+$/.test(q) ? q : effectiveTerm;
    const seenPins = new Set<string>();
    for (const city of MOCK_CITIES) {
      for (const pin of city.popularPincodes) {
        if (pin.startsWith(pinTerm) || pin === pinTerm) {
          seenPins.add(pin);
          results.push({
            type: "pincode",
            title: pin,
            subtitle: `${city.name}, ${city.stateName} PIN code`,
            href: `/india/${city.stateSlug}/${city.slug}/${pin}/ev-charging-stations`,
            badge: "PIN Code",
          });
        }
      }
    }
    for (const [pin, info] of Object.entries(CANONICAL_PINCODES)) {
      if ((pin.startsWith(pinTerm) || pin === pinTerm) && !seenPins.has(pin)) {
        seenPins.add(pin);
        results.push({
          type: "pincode",
          title: pin,
          subtitle: `${info.cityName}, ${info.stateName} PIN code (${info.district})`,
          href: `/india/${info.stateSlug}/${info.citySlug}/${pin}/ev-charging-stations`,
          badge: "PIN Code",
        });
      }
    }
  }

  // Match Cities (using both full query and effective term)
  for (const city of MOCK_CITIES) {
    const cityNameLower = city.name.toLowerCase();
    if (
      cityNameLower.includes(q) ||
      city.slug.includes(q) ||
      (effectiveTerm !== q && (cityNameLower.includes(effectiveTerm) || city.slug.includes(effectiveTerm)))
    ) {
      results.push({
        type: "city",
        title: city.name,
        subtitle: `${city.stateName} · ${city.stationCount} charging stations`,
        href: `/india/${city.stateSlug}/${city.slug}/ev-charging-stations`,
        badge: "City",
      });
    }
  }

  // Match Operators
  for (const op of MOCK_OPERATORS) {
    const opNameLower = op.name.toLowerCase();
    if (
      opNameLower.includes(q) ||
      op.slug.includes(q) ||
      (effectiveTerm !== q && (opNameLower.includes(effectiveTerm) || op.slug.includes(effectiveTerm)))
    ) {
      results.push({
        type: "operator",
        title: op.name,
        subtitle: `Charging network · ${op.stationCount}+ points across India`,
        href: `/map?operator=${op.slug}`,
        badge: "Operator",
      });
    }
  }

  // Match Stations
  for (const station of MOCK_STATIONS) {
    const nameLower = station.name.toLowerCase();
    const addressLower = station.address.toLowerCase();
    const matchesFull =
      nameLower.includes(q) ||
      addressLower.includes(q) ||
      station.pincode.includes(q);
    const matchesEffective =
      effectiveTerm !== q &&
      (nameLower.includes(effectiveTerm) ||
        addressLower.includes(effectiveTerm) ||
        station.pincode.includes(effectiveTerm));

    if (matchesFull || matchesEffective) {
      results.push({
        type: "station",
        title: station.name,
        subtitle: `${station.address} · ${station.fastestPowerKw}kW`,
        href: `/station/${station.slug}`,
        badge: station.operator.name,
      });
    }
  }

  return results.slice(0, 15);
}

export * from "./data";
