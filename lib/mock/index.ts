import { distanceInKilometers } from "@/lib/geo/distance";
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

export function searchMockEntities(rawQuery: string): SearchEntityResult[] {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return [];

  const results: SearchEntityResult[] = [];

  // Match PIN codes
  if (/^\d+$/.test(q)) {
    for (const city of MOCK_CITIES) {
      for (const pin of city.popularPincodes) {
        if (pin.startsWith(q) || pin === q) {
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
  }

  // Match Cities
  for (const city of MOCK_CITIES) {
    if (city.name.toLowerCase().includes(q) || city.slug.includes(q)) {
      results.push({
        type: "city",
        title: city.name,
        subtitle: `${city.stateName} · ${city.stationCount} charging stations`,
        href: `/india/${city.stateSlug}/${city.slug}/ev-charging-stations`,
        badge: "City",
      });
    }
  }

  // Match Stations
  for (const station of MOCK_STATIONS) {
    if (
      station.name.toLowerCase().includes(q) ||
      station.address.toLowerCase().includes(q) ||
      station.pincode.includes(q)
    ) {
      results.push({
        type: "station",
        title: station.name,
        subtitle: `${station.address} · ${station.fastestPowerKw}kW`,
        href: `/station/${station.slug}`,
        badge: station.operator.name,
      });
    }
  }

  // Match Operators
  for (const op of MOCK_OPERATORS) {
    if (op.name.toLowerCase().includes(q)) {
      results.push({
        type: "operator",
        title: op.name,
        subtitle: `Charging network · ${op.stationCount}+ points across India`,
        href: `/map?operator=${op.slug}`,
        badge: "Operator",
      });
    }
  }

  return results.slice(0, 15);
}

export * from "./data";
