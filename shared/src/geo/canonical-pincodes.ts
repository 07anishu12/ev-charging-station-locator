import { distanceInKilometers } from "./distance";

export interface CanonicalPincode {
  pincode: string;
  cityName: string;
  citySlug: string;
  stateName: string;
  stateSlug: string;
  stateCode: string;
  district: string;
  latitude: number;
  longitude: number;
}

/**
 * Curated geographic anchor points for major Indian postal codes.
 * Uses official Indian Postal Service centroids and coordinates.
 * Covers major metro corridors, EV hubs, and satellite localities.
 */
export const CANONICAL_PINCODES: Record<string, CanonicalPincode> = {
  // -------------------------------------------------------------------------
  // Delhi (National Capital Territory)
  // -------------------------------------------------------------------------
  "110001": {
    pincode: "110001",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "New Delhi",
    latitude: 28.6289,
    longitude: 77.2185,
  },
  "110003": {
    pincode: "110003",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "New Delhi",
    latitude: 28.6003,
    longitude: 77.2274,
  },
  "110005": {
    pincode: "110005",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "Central Delhi",
    latitude: 28.6517,
    longitude: 77.1906,
  },
  "110006": {
    pincode: "110006",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "North Delhi",
    latitude: 28.6672,
    longitude: 77.2285,
  },
  "110010": {
    pincode: "110010",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "New Delhi",
    latitude: 28.5912,
    longitude: 77.1614,
  },
  "110015": {
    pincode: "110015",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6578,
    longitude: 77.1432,
  },
  "110016": {
    pincode: "110016",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South Delhi",
    latitude: 28.5582,
    longitude: 77.2069,
  },
  "110017": {
    pincode: "110017",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South Delhi",
    latitude: 28.5284,
    longitude: 77.2185,
  },
  "110018": {
    pincode: "110018",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6366,
    longitude: 77.0961,
  },
  "110019": {
    pincode: "110019",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South East Delhi",
    latitude: 28.5492,
    longitude: 77.2526,
  },
  "110020": {
    pincode: "110020",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South East Delhi",
    latitude: 28.5358,
    longitude: 77.2719,
  },
  "110021": {
    pincode: "110021",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "New Delhi",
    latitude: 28.5873,
    longitude: 77.1895,
  },
  "110024": {
    pincode: "110024",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South East Delhi",
    latitude: 28.5683,
    longitude: 77.2432,
  },
  "110026": {
    pincode: "110026",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6685,
    longitude: 77.1294,
  },
  "110027": {
    pincode: "110027",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6421,
    longitude: 77.1062,
  },
  "110032": {
    pincode: "110032",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "Shahdara",
    latitude: 28.6734,
    longitude: 77.2912,
  },
  "110034": {
    pincode: "110034",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "North West Delhi",
    latitude: 28.6924,
    longitude: 77.1517,
  },
  "110037": {
    pincode: "110037",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.5501,
    longitude: 77.1219,
  },
  "110041": {
    pincode: "110041",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6833,
    longitude: 77.0667,
  },
  "110048": {
    pincode: "110048",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South Delhi",
    latitude: 28.5529,
    longitude: 77.2384,
  },
  "110049": {
    pincode: "110049",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South Delhi",
    latitude: 28.5688,
    longitude: 77.2201,
  },
  "110054": {
    pincode: "110054",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "Central Delhi",
    latitude: 28.6811,
    longitude: 77.2238,
  },
  "110057": {
    pincode: "110057",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.5607,
    longitude: 77.1582,
  },
  "110058": {
    pincode: "110058",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6292,
    longitude: 77.0818,
  },
  "110059": {
    pincode: "110059",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "West Delhi",
    latitude: 28.6219,
    longitude: 77.0625,
  },
  "110070": {
    pincode: "110070",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.5408,
    longitude: 77.1558,
  },
  "110075": {
    pincode: "110075",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.5861,
    longitude: 77.0589,
  },
  "110076": {
    pincode: "110076",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South East Delhi",
    latitude: 28.5321,
    longitude: 77.2905,
  },
  "110077": {
    pincode: "110077",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.5522,
    longitude: 77.0583,
  },
  "110078": {
    pincode: "110078",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "South West Delhi",
    latitude: 28.6012,
    longitude: 77.0315,
  },
  "110085": {
    pincode: "110085",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "North West Delhi",
    latitude: 28.7145,
    longitude: 77.1132,
  },
  "110088": {
    pincode: "110088",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "North West Delhi",
    latitude: 28.7056,
    longitude: 77.1642,
  },
  "110091": {
    pincode: "110091",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "East Delhi",
    latitude: 28.6045,
    longitude: 77.2941,
  },
  "110092": {
    pincode: "110092",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "East Delhi",
    latitude: 28.6475,
    longitude: 77.3155,
  },
  "110095": {
    pincode: "110095",
    cityName: "Delhi",
    citySlug: "delhi",
    stateName: "Delhi",
    stateSlug: "delhi",
    stateCode: "DL",
    district: "Shahdara",
    latitude: 28.6759,
    longitude: 77.3214,
  },

  // -------------------------------------------------------------------------
  // Haryana (Gurugram / Faridabad)
  // -------------------------------------------------------------------------
  "122001": {
    pincode: "122001",
    cityName: "Gurugram",
    citySlug: "gurugram",
    stateName: "Haryana",
    stateSlug: "haryana",
    stateCode: "HR",
    district: "Gurugram",
    latitude: 28.4682,
    longitude: 77.0322,
  },
  "122002": {
    pincode: "122002",
    cityName: "Gurugram",
    citySlug: "gurugram",
    stateName: "Haryana",
    stateSlug: "haryana",
    stateCode: "HR",
    district: "Gurugram",
    latitude: 28.4952,
    longitude: 77.0894,
  },
  "122018": {
    pincode: "122018",
    cityName: "Gurugram",
    citySlug: "gurugram",
    stateName: "Haryana",
    stateSlug: "haryana",
    stateCode: "HR",
    district: "Gurugram",
    latitude: 28.4385,
    longitude: 77.0421,
  },

  // -------------------------------------------------------------------------
  // Uttar Pradesh (Noida / Greater Noida / Ghaziabad)
  // -------------------------------------------------------------------------
  "201301": {
    pincode: "201301",
    cityName: "Noida",
    citySlug: "noida",
    stateName: "Uttar Pradesh",
    stateSlug: "uttar-pradesh",
    stateCode: "UP",
    district: "Gautam Buddha Nagar",
    latitude: 28.5355,
    longitude: 77.391,
  },
  "201304": {
    pincode: "201304",
    cityName: "Noida",
    citySlug: "noida",
    stateName: "Uttar Pradesh",
    stateSlug: "uttar-pradesh",
    stateCode: "UP",
    district: "Gautam Buddha Nagar",
    latitude: 28.5204,
    longitude: 77.3621,
  },

  // -------------------------------------------------------------------------
  // Maharashtra (Mumbai / Pune)
  // -------------------------------------------------------------------------
  "400001": {
    pincode: "400001",
    cityName: "Mumbai",
    citySlug: "mumbai",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Mumbai City",
    latitude: 18.9322,
    longitude: 72.8335,
  },
  "400013": {
    pincode: "400013",
    cityName: "Mumbai",
    citySlug: "mumbai",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Mumbai City",
    latitude: 18.9953,
    longitude: 72.8242,
  },
  "400051": {
    pincode: "400051",
    cityName: "Mumbai",
    citySlug: "mumbai",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Mumbai Suburban",
    latitude: 19.0664,
    longitude: 72.8687,
  },
  "400069": {
    pincode: "400069",
    cityName: "Mumbai",
    citySlug: "mumbai",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Mumbai Suburban",
    latitude: 19.1136,
    longitude: 72.8697,
  },
  "411001": {
    pincode: "411001",
    cityName: "Pune",
    citySlug: "pune",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Pune",
    latitude: 18.5284,
    longitude: 73.8743,
  },
  "411045": {
    pincode: "411045",
    cityName: "Pune",
    citySlug: "pune",
    stateName: "Maharashtra",
    stateSlug: "maharashtra",
    stateCode: "MH",
    district: "Pune",
    latitude: 18.5726,
    longitude: 73.7745,
  },

  // -------------------------------------------------------------------------
  // Karnataka (Bengaluru)
  // -------------------------------------------------------------------------
  "560001": {
    pincode: "560001",
    cityName: "Bengaluru",
    citySlug: "bengaluru",
    stateName: "Karnataka",
    stateSlug: "karnataka",
    stateCode: "KA",
    district: "Bengaluru Urban",
    latitude: 12.9756,
    longitude: 77.6066,
  },
  "560034": {
    pincode: "560034",
    cityName: "Bengaluru",
    citySlug: "bengaluru",
    stateName: "Karnataka",
    stateSlug: "karnataka",
    stateCode: "KA",
    district: "Bengaluru Urban",
    latitude: 12.9352,
    longitude: 77.6245,
  },
  "560038": {
    pincode: "560038",
    cityName: "Bengaluru",
    citySlug: "bengaluru",
    stateName: "Karnataka",
    stateSlug: "karnataka",
    stateCode: "KA",
    district: "Bengaluru Urban",
    latitude: 12.9719,
    longitude: 77.6412,
  },
  "560100": {
    pincode: "560100",
    cityName: "Bengaluru",
    citySlug: "bengaluru",
    stateName: "Karnataka",
    stateSlug: "karnataka",
    stateCode: "KA",
    district: "Bengaluru Urban",
    latitude: 12.8452,
    longitude: 77.6602,
  },

  // -------------------------------------------------------------------------
  // Telangana (Hyderabad)
  // -------------------------------------------------------------------------
  "500001": {
    pincode: "500001",
    cityName: "Hyderabad",
    citySlug: "hyderabad",
    stateName: "Telangana",
    stateSlug: "telangana",
    stateCode: "TS",
    district: "Hyderabad",
    latitude: 17.3871,
    longitude: 78.4735,
  },
  "500032": {
    pincode: "500032",
    cityName: "Hyderabad",
    citySlug: "hyderabad",
    stateName: "Telangana",
    stateSlug: "telangana",
    stateCode: "TS",
    district: "Rangareddy",
    latitude: 17.4156,
    longitude: 78.3427,
  },

  // -------------------------------------------------------------------------
  // Tamil Nadu (Chennai)
  // -------------------------------------------------------------------------
  "600001": {
    pincode: "600001",
    cityName: "Chennai",
    citySlug: "chennai",
    stateName: "Tamil Nadu",
    stateSlug: "tamil-nadu",
    stateCode: "TN",
    district: "Chennai",
    latitude: 13.0886,
    longitude: 80.2882,
  },
  "600040": {
    pincode: "600040",
    cityName: "Chennai",
    citySlug: "chennai",
    stateName: "Tamil Nadu",
    stateSlug: "tamil-nadu",
    stateCode: "TN",
    district: "Chennai",
    latitude: 13.0878,
    longitude: 80.2091,
  },
};

/**
 * Returns canonical PIN information if registered.
 */
export function getCanonicalPincode(pincode: string): CanonicalPincode | null {
  return CANONICAL_PINCODES[pincode] ?? null;
}

/**
 * Returns all canonical PIN records.
 */
export function getAllCanonicalPincodes(): CanonicalPincode[] {
  return Object.values(CANONICAL_PINCODES);
}

/**
 * Resolves Indian state/postal circle based on the first two digits of an Indian PIN code.
 */
export function resolvePincodeStateFromPrefix(pincode: string): {
  stateName: string;
  stateSlug: string;
  stateCode: string;
} | null {
  if (!/^\d{6}$/.test(pincode)) return null;

  const prefix = parseInt(pincode.slice(0, 2), 10);

  if (prefix === 11) return { stateName: "Delhi", stateSlug: "delhi", stateCode: "DL" };
  if (prefix >= 12 && prefix <= 13) return { stateName: "Haryana", stateSlug: "haryana", stateCode: "HR" };
  if (prefix >= 14 && prefix <= 15) return { stateName: "Punjab", stateSlug: "punjab", stateCode: "PB" };
  if (prefix === 16) return { stateName: "Chandigarh", stateSlug: "chandigarh", stateCode: "CH" };
  if (prefix === 17) return { stateName: "Himachal Pradesh", stateSlug: "himachal-pradesh", stateCode: "HP" };
  if (prefix >= 18 && prefix <= 19) return { stateName: "Jammu and Kashmir", stateSlug: "jammu-and-kashmir", stateCode: "JK" };
  if (prefix >= 20 && prefix <= 28) return { stateName: "Uttar Pradesh", stateSlug: "uttar-pradesh", stateCode: "UP" };
  if (prefix >= 30 && prefix <= 34) return { stateName: "Rajasthan", stateSlug: "rajasthan", stateCode: "RJ" };
  if (prefix >= 36 && prefix <= 39) return { stateName: "Gujarat", stateSlug: "gujarat", stateCode: "GJ" };
  if (prefix >= 40 && prefix <= 44) return { stateName: "Maharashtra", stateSlug: "maharashtra", stateCode: "MH" };
  if (prefix >= 45 && prefix <= 49) return { stateName: "Madhya Pradesh", stateSlug: "madhya-pradesh", stateCode: "MP" };
  if (prefix >= 50 && prefix <= 53) return { stateName: "Telangana", stateSlug: "telangana", stateCode: "TS" };
  if (prefix >= 56 && prefix <= 59) return { stateName: "Karnataka", stateSlug: "karnataka", stateCode: "KA" };
  if (prefix >= 60 && prefix <= 64) return { stateName: "Tamil Nadu", stateSlug: "tamil-nadu", stateCode: "TN" };
  if (prefix >= 67 && prefix <= 69) return { stateName: "Kerala", stateSlug: "kerala", stateCode: "KL" };
  if (prefix >= 70 && prefix <= 74) return { stateName: "West Bengal", stateSlug: "west-bengal", stateCode: "WB" };
  if (prefix >= 75 && prefix <= 77) return { stateName: "Odisha", stateSlug: "odisha", stateCode: "OD" };
  if (prefix === 78) return { stateName: "Assam", stateSlug: "assam", stateCode: "AS" };
  if (prefix >= 80 && prefix <= 85) return { stateName: "Bihar", stateSlug: "bihar", stateCode: "BR" };

  return null;
}

/**
 * Finds geographically nearest canonical PIN codes to a target coordinate.
 * Note: Uses Haversine spherical distance calculation — NEVER numerical PIN closeness!
 */
export function findNearbyCanonicalPincodes(
  latitude: number,
  longitude: number,
  options: {
    excludePincode?: string;
    maxDistanceKm?: number;
    limit?: number;
  } = {},
): Array<{
  pincode: string;
  city: string;
  district: string;
  distanceKm: number;
}> {
  const maxDistanceKm = options.maxDistanceKm ?? 25;
  const limit = options.limit ?? 10;
  const exclude = options.excludePincode;

  const results: Array<{
    pincode: string;
    city: string;
    district: string;
    distanceKm: number;
  }> = [];

  for (const pin of Object.values(CANONICAL_PINCODES)) {
    if (exclude && pin.pincode === exclude) continue;

    const dist = distanceInKilometers(
      { latitude, longitude },
      { latitude: pin.latitude, longitude: pin.longitude },
    );

    if (dist <= maxDistanceKm) {
      results.push({
        pincode: pin.pincode,
        city: pin.cityName,
        district: pin.district,
        distanceKm: Math.round(dist * 10) / 10,
      });
    }
  }

  // Sort strictly by actual geographic distance
  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results.slice(0, limit);
}

export function lookupCanonicalPincode(pincode: string): CanonicalPincode | null {
  return CANONICAL_PINCODES[pincode] || null;
}

