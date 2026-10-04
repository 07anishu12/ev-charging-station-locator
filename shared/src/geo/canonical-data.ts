import { createSlug } from "../utils/slug";

export interface CanonicalState {
  name: string;
  slug: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface CanonicalCityMapping {
  canonicalName: string;
  canonicalSlug: string;
  stateSlug: string;
  stateName: string;
  aliases: string[];
  defaultCoordinates?: { latitude: number; longitude: number };
}

/**
 * Standard Indian States and Union Territories.
 */
export const INDIAN_STATES: CanonicalState[] = [
  { name: "Andhra Pradesh", slug: "andhra-pradesh", code: "AP", latitude: 15.9129, longitude: 79.74 },
  { name: "Arunachal Pradesh", slug: "arunachal-pradesh", code: "AR", latitude: 28.218, longitude: 94.7278 },
  { name: "Assam", slug: "assam", code: "AS", latitude: 26.2006, longitude: 92.9376 },
  { name: "Bihar", slug: "bihar", code: "BR", latitude: 25.0961, longitude: 85.3131 },
  { name: "Chandigarh", slug: "chandigarh", code: "CH", latitude: 30.7333, longitude: 76.7794 },
  { name: "Chhattisgarh", slug: "chhattisgarh", code: "CG", latitude: 21.2787, longitude: 81.8661 },
  { name: "Dadra and Nagar Haveli and Daman and Diu", slug: "dadra-and-nagar-haveli-and-daman-and-diu", code: "DH", latitude: 20.4283, longitude: 72.8397 },
  { name: "Delhi", slug: "delhi", code: "DL", latitude: 28.6139, longitude: 77.209 },
  { name: "Goa", slug: "goa", code: "GA", latitude: 15.2993, longitude: 74.124 },
  { name: "Gujarat", slug: "gujarat", code: "GJ", latitude: 22.2587, longitude: 71.1924 },
  { name: "Haryana", slug: "haryana", code: "HR", latitude: 29.0588, longitude: 76.0856 },
  { name: "Himachal Pradesh", slug: "himachal-pradesh", code: "HP", latitude: 31.1048, longitude: 77.1734 },
  { name: "Jammu and Kashmir", slug: "jammu-and-kashmir", code: "JK", latitude: 33.7782, longitude: 76.5762 },
  { name: "Jharkhand", slug: "jharkhand", code: "JH", latitude: 23.6102, longitude: 85.2799 },
  { name: "Karnataka", slug: "karnataka", code: "KA", latitude: 15.3173, longitude: 75.7139 },
  { name: "Kerala", slug: "kerala", code: "KL", latitude: 10.8505, longitude: 76.2711 },
  { name: "Ladakh", slug: "ladakh", code: "LA", latitude: 34.1526, longitude: 77.5771 },
  { name: "Lakshadweep", slug: "lakshadweep", code: "LD", latitude: 10.328, longitude: 72.7847 },
  { name: "Madhya Pradesh", slug: "madhya-pradesh", code: "MP", latitude: 22.9734, longitude: 78.6569 },
  { name: "Maharashtra", slug: "maharashtra", code: "MH", latitude: 19.7515, longitude: 75.7139 },
  { name: "Manipur", slug: "manipur", code: "MN", latitude: 24.6637, longitude: 93.9063 },
  { name: "Meghalaya", slug: "meghalaya", code: "ML", latitude: 25.467, longitude: 91.3662 },
  { name: "Mizoram", slug: "mizoram", code: "MZ", latitude: 23.1645, longitude: 92.9376 },
  { name: "Nagaland", slug: "nagaland", code: "NL", latitude: 26.1584, longitude: 94.5624 },
  { name: "Odisha", slug: "odisha", code: "OD", latitude: 20.9517, longitude: 85.0985 },
  { name: "Puducherry", slug: "puducherry", code: "PY", latitude: 11.9416, longitude: 79.8083 },
  { name: "Punjab", slug: "punjab", code: "PB", latitude: 31.1471, longitude: 75.3412 },
  { name: "Rajasthan", slug: "rajasthan", code: "RJ", latitude: 27.0238, longitude: 74.2179 },
  { name: "Sikkim", slug: "sikkim", code: "SK", latitude: 27.533, longitude: 88.5122 },
  { name: "Tamil Nadu", slug: "tamil-nadu", code: "TN", latitude: 11.1271, longitude: 78.6569 },
  { name: "Telangana", slug: "telangana", code: "TS", latitude: 18.1124, longitude: 79.0193 },
  { name: "Tripura", slug: "tripura", code: "TR", latitude: 23.9408, longitude: 91.9882 },
  { name: "Uttar Pradesh", slug: "uttar-pradesh", code: "UP", latitude: 26.8467, longitude: 80.9462 },
  { name: "Uttarakhand", slug: "uttarakhand", code: "UK", latitude: 30.0668, longitude: 79.0193 },
  { name: "West Bengal", slug: "west-bengal", code: "WB", latitude: 22.9868, longitude: 87.855 },
];

export const CANONICAL_STATES = INDIAN_STATES;

/**
 * Common canonical city mappings and historical/regional aliases.
 */
export const CANONICAL_CITIES: CanonicalCityMapping[] = [
  {
    canonicalName: "Delhi",
    canonicalSlug: "delhi",
    stateSlug: "delhi",
    stateName: "Delhi",
    aliases: [
      "new delhi",
      "new-delhi",
      "old delhi",
      "delhi ncr",
      "ncr",
      "nct of delhi",
      "south delhi",
      "north delhi",
      "west delhi",
      "east delhi",
      "central delhi",
      "dwarka",
      "aerocity",
      "connaught place",
    ],
    defaultCoordinates: { latitude: 28.6139, longitude: 77.209 },
  },
  {
    canonicalName: "Bengaluru",
    canonicalSlug: "bengaluru",
    stateSlug: "karnataka",
    stateName: "Karnataka",
    aliases: ["bangalore", "bangaluru", "bengaluru urban", "bengaluru rural", "bangalore urban"],
    defaultCoordinates: { latitude: 12.9716, longitude: 77.5946 },
  },
  {
    canonicalName: "Mumbai",
    canonicalSlug: "mumbai",
    stateSlug: "maharashtra",
    stateName: "Maharashtra",
    aliases: ["bombay", "mumbai suburban", "mumbai city", "greater mumbai"],
    defaultCoordinates: { latitude: 19.076, longitude: 72.8777 },
  },
  {
    canonicalName: "Navi Mumbai",
    canonicalSlug: "navi-mumbai",
    stateSlug: "maharashtra",
    stateName: "Maharashtra",
    aliases: ["new bombay", "vashi", "belapur", "nerul", "kharghar", "panvel"],
    defaultCoordinates: { latitude: 19.033, longitude: 73.0297 },
  },
  {
    canonicalName: "Gurugram",
    canonicalSlug: "gurugram",
    stateSlug: "haryana",
    stateName: "Haryana",
    aliases: ["gurgaon", "gurugram haryana"],
    defaultCoordinates: { latitude: 28.4595, longitude: 77.0266 },
  },
  {
    canonicalName: "Kolkata",
    canonicalSlug: "kolkata",
    stateSlug: "west-bengal",
    stateName: "West Bengal",
    aliases: ["calcutta"],
    defaultCoordinates: { latitude: 22.5726, longitude: 88.3639 },
  },
  {
    canonicalName: "Chennai",
    canonicalSlug: "chennai",
    stateSlug: "tamil-nadu",
    stateName: "Tamil Nadu",
    aliases: ["madras"],
    defaultCoordinates: { latitude: 13.0827, longitude: 80.2707 },
  },
  {
    canonicalName: "Hyderabad",
    canonicalSlug: "hyderabad",
    stateSlug: "telangana",
    stateName: "Telangana",
    aliases: ["secunderabad", "cyberabad"],
    defaultCoordinates: { latitude: 17.385, longitude: 78.4867 },
  },
  {
    canonicalName: "Pune",
    canonicalSlug: "pune",
    stateSlug: "maharashtra",
    stateName: "Maharashtra",
    aliases: ["poona", "pcmc", "pimpri-chinchwad"],
    defaultCoordinates: { latitude: 18.5204, longitude: 73.8567 },
  },
  {
    canonicalName: "Ahmedabad",
    canonicalSlug: "ahmedabad",
    stateSlug: "gujarat",
    stateName: "Gujarat",
    aliases: ["amdavad", "ahmadabad"],
    defaultCoordinates: { latitude: 23.0225, longitude: 72.5714 },
  },
  {
    canonicalName: "Noida",
    canonicalSlug: "noida",
    stateSlug: "uttar-pradesh",
    stateName: "Uttar Pradesh",
    aliases: ["greater noida", "gautam buddha nagar"],
    defaultCoordinates: { latitude: 28.5355, longitude: 77.391 },
  },
  {
    canonicalName: "Chandigarh",
    canonicalSlug: "chandigarh",
    stateSlug: "chandigarh",
    stateName: "Chandigarh",
    aliases: ["mohali", "panchkula"],
    defaultCoordinates: { latitude: 30.7333, longitude: 76.7794 },
  },
  {
    canonicalName: "Kochi",
    canonicalSlug: "kochi",
    stateSlug: "kerala",
    stateName: "Kerala",
    aliases: ["cochin", "ernakulam"],
    defaultCoordinates: { latitude: 9.9312, longitude: 76.2673 },
  },
  {
    canonicalName: "Vadodara",
    canonicalSlug: "vadodara",
    stateSlug: "gujarat",
    stateName: "Gujarat",
    aliases: ["baroda"],
    defaultCoordinates: { latitude: 22.3072, longitude: 73.1812 },
  },
  {
    canonicalName: "Thiruvananthapuram",
    canonicalSlug: "thiruvananthapuram",
    stateSlug: "kerala",
    stateName: "Kerala",
    aliases: ["trivandrum"],
    defaultCoordinates: { latitude: 8.5241, longitude: 76.9366 },
  },
  {
    canonicalName: "Bhubaneswar",
    canonicalSlug: "bhubaneswar",
    stateSlug: "odisha",
    stateName: "Odisha",
    aliases: ["bhubaneshwar"],
    defaultCoordinates: { latitude: 20.2961, longitude: 85.8245 },
  },
];

/**
 * Resolves an Indian state from messy/raw provider string.
 */
export function resolveCanonicalState(input?: string | null): CanonicalState | null {
  if (!input) return null;
  const clean = input.trim().toLowerCase();
  const slug = createSlug(clean);

  // Exact or slug match
  for (const state of INDIAN_STATES) {
    if (state.slug === slug || state.name.toLowerCase() === clean || state.code.toLowerCase() === clean) {
      return state;
    }
  }

  // Common spelling variations & shortcuts
  if (clean.includes("delhi") || clean.includes("ncr") || clean.includes("nct")) {
    return INDIAN_STATES.find((s) => s.slug === "delhi") ?? null;
  }
  if (clean.includes("maharashtra") || clean.includes("maharshtra")) {
    return INDIAN_STATES.find((s) => s.slug === "maharashtra") ?? null;
  }
  if (clean.includes("karnataka") || clean.includes("karnatak")) {
    return INDIAN_STATES.find((s) => s.slug === "karnataka") ?? null;
  }
  if (clean.includes("tamil nadu") || clean.includes("tamilnadu")) {
    return INDIAN_STATES.find((s) => s.slug === "tamil-nadu") ?? null;
  }
  if (clean.includes("uttar pradesh") || clean === "up") {
    return INDIAN_STATES.find((s) => s.slug === "uttar-pradesh") ?? null;
  }
  if (clean.includes("andhra") || clean === "ap") {
    return INDIAN_STATES.find((s) => s.slug === "andhra-pradesh") ?? null;
  }
  if (clean.includes("telangana") || clean === "tg" || clean === "ts") {
    return INDIAN_STATES.find((s) => s.slug === "telangana") ?? null;
  }
  if (clean.includes("orissa") || clean.includes("odisha")) {
    return INDIAN_STATES.find((s) => s.slug === "odisha") ?? null;
  }
  if (clean.includes("west bengal") || clean === "wb") {
    return INDIAN_STATES.find((s) => s.slug === "west-bengal") ?? null;
  }

  return null;
}

export interface ResolvedCityResult {
  canonicalName: string;
  canonicalSlug: string;
  aliasUsed: string | null;
  stateSlug: string;
  stateName: string;
  stateCode: string;
}

/**
 * Resolves a canonical city from raw city/town, address, and state.
 */
export function resolveCanonicalCity(
  inputCity?: string | null,
  inputAddress?: string | null,
  inputState?: string | null,
  options: { allowFallback?: boolean } = { allowFallback: false },
): ResolvedCityResult | null {
  const rawCity = inputCity?.trim().toLowerCase() || "";
  const rawAddress = inputAddress?.trim().toLowerCase() || "";
  const fullText = `${rawCity} ${rawAddress}`;

  // 1. Check mapped canonical cities and aliases
  for (const city of CANONICAL_CITIES) {
    const st = resolveCanonicalState(city.stateSlug);
    const stateCode = st?.code ?? "IN";

    if (city.canonicalSlug === createSlug(rawCity) || city.canonicalName.toLowerCase() === rawCity) {
      return {
        canonicalName: city.canonicalName,
        canonicalSlug: city.canonicalSlug,
        aliasUsed: null,
        stateSlug: city.stateSlug,
        stateName: city.stateName,
        stateCode,
      };
    }

    for (const alias of city.aliases) {
      if (rawCity === alias || rawCity.includes(alias)) {
        return {
          canonicalName: city.canonicalName,
          canonicalSlug: city.canonicalSlug,
          aliasUsed: alias,
          stateSlug: city.stateSlug,
          stateName: city.stateName,
          stateCode,
        };
      }
    }
  }

  // 2. Check if address text contains prominent canonical aliases (e.g. "Delhi", "Connaught Place", "Gurgaon")
  for (const city of CANONICAL_CITIES) {
    const st = resolveCanonicalState(city.stateSlug);
    const stateCode = st?.code ?? "IN";

    // If city is Delhi and text contains delhi or aerocity or dwarka
    if (city.canonicalSlug === "delhi" && (fullText.includes("delhi") || fullText.includes("aerocity") || fullText.includes("dwarka"))) {
      return {
        canonicalName: city.canonicalName,
        canonicalSlug: city.canonicalSlug,
        aliasUsed: "delhi",
        stateSlug: city.stateSlug,
        stateName: city.stateName,
        stateCode,
      };
    }
    for (const alias of city.aliases) {
      if (fullText.includes(` ${alias} `) || fullText.endsWith(` ${alias}`) || fullText.startsWith(`${alias} `)) {
        return {
          canonicalName: city.canonicalName,
          canonicalSlug: city.canonicalSlug,
          aliasUsed: alias,
          stateSlug: city.stateSlug,
          stateName: city.stateName,
          stateCode,
        };
      }
    }
  }

  // 3. Fallback for any other valid Indian town supplied in inputCity if fallback is enabled
  if (
    options.allowFallback &&
    inputCity &&
    inputCity.trim().length >= 2 &&
    !["unknown", "n/a", "none", "india"].includes(rawCity)
  ) {
    const cleanName = inputCity.trim().replace(/[,\-_.]/g, " ").trim();
    const words = cleanName.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    const canonicalName = words.join(" ");
    const canonicalSlug = createSlug(canonicalName);

    const resolvedState = resolveCanonicalState(inputState);

    return {
      canonicalName,
      canonicalSlug,
      aliasUsed: null,
      stateSlug: resolvedState?.slug ?? "india",
      stateName: resolvedState?.name ?? "India",
      stateCode: resolvedState?.code ?? "IN",
    };
  }

  return null;
}

/**
 * Computes the geographic centroid (arithmetic mean of latitudes and longitudes)
 * of all valid charging stations associated with a city.
 */
export function calculateCityCentroid(coordinates: Array<{ lat: number; lng: number }>): {
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
} | null {
  const validCoords = coordinates.filter(
    (c) =>
      typeof c.lat === "number" &&
      typeof c.lng === "number" &&
      !isNaN(c.lat) &&
      !isNaN(c.lng) &&
      c.lat >= -90 &&
      c.lat <= 90 &&
      c.lng >= -180 &&
      c.lng <= 180 &&
      !(c.lat === 0 && c.lng === 0),
  );

  if (validCoords.length === 0) return null;

  const sumLat = validCoords.reduce((acc, c) => acc + c.lat, 0);
  const sumLng = validCoords.reduce((acc, c) => acc + c.lng, 0);

  const latitude = Number((sumLat / validCoords.length).toFixed(6));
  const longitude = Number((sumLng / validCoords.length).toFixed(6));

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
}
