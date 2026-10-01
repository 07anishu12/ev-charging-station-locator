export interface MockState {
  id: string;
  name: string;
  slug: string;
  code: string;
  stationCount: number;
  cityCount: number;
  latitude: number;
  longitude: number;
}

export interface MockCity {
  id: string;
  name: string;
  slug: string;
  stateName: string;
  stateSlug: string;
  stationCount: number;
  fastChargerCount: number;
  latitude: number;
  longitude: number;
  popularPincodes: string[];
}

export interface MockOperator {
  id: string;
  name: string;
  slug: string;
  stationCount: number;
  website: string;
}

export interface MockConnector {
  id: string;
  type: string;
  normalizedType: "ccs2" | "type2" | "chademo" | "gbt";
  powerKw: number;
  voltage?: number;
  amps?: number;
  status: "available" | "busy" | "unavailable" | "unknown";
  quantity: number;
}

export interface MockStation {
  id: string;
  ocmId: number;
  slug: string;
  name: string;
  operator: {
    id: string;
    name: string;
    slug: string;
    website?: string;
  };
  address: string;
  city: {
    name: string;
    slug: string;
  };
  state: {
    name: string;
    slug: string;
    code: string;
  };
  district: string;
  pincode: string;
  latitude: number;
  longitude: number;
  status: "Operational" | "Not Operational" | "Unknown";
  operationalStatus: "available" | "busy" | "unavailable" | "unknown";
  usageType: string;
  dataProvider: string;
  dataLicense: string;
  ocmUrl: string;
  lastUpdated: string;
  connectors: MockConnector[];
  fastestPowerKw: number;
  distanceKm?: number;
}

export const MOCK_STATES: MockState[] = [
  { id: "st-delhi", name: "Delhi", slug: "delhi", code: "DL", stationCount: 420, cityCount: 1, latitude: 28.6139, longitude: 77.209 },
  { id: "st-maharashtra", name: "Maharashtra", slug: "maharashtra", code: "MH", stationCount: 680, cityCount: 8, latitude: 19.7515, longitude: 75.7139 },
  { id: "st-karnataka", name: "Karnataka", slug: "karnataka", code: "KA", stationCount: 560, cityCount: 6, latitude: 15.3173, longitude: 75.7139 },
  { id: "st-haryana", name: "Haryana", slug: "haryana", code: "HR", stationCount: 310, cityCount: 5, latitude: 29.0588, longitude: 76.0856 },
  { id: "st-tamil-nadu", name: "Tamil Nadu", slug: "tamil-nadu", code: "TN", stationCount: 440, cityCount: 7, latitude: 11.1271, longitude: 78.6569 },
  { id: "st-telangana", name: "Telangana", slug: "telangana", code: "TS", stationCount: 380, cityCount: 3, latitude: 18.1124, longitude: 79.0193 },
  { id: "st-gujarat", name: "Gujarat", slug: "gujarat", code: "GJ", stationCount: 390, cityCount: 5, latitude: 22.2587, longitude: 71.1924 },
  { id: "st-uttar-pradesh", name: "Uttar Pradesh", slug: "uttar-pradesh", code: "UP", stationCount: 450, cityCount: 9, latitude: 26.8467, longitude: 80.9462 },
  { id: "st-rajasthan", name: "Rajasthan", slug: "rajasthan", code: "RJ", stationCount: 290, cityCount: 5, latitude: 27.0238, longitude: 74.2179 },
  { id: "st-kerala", name: "Kerala", slug: "kerala", code: "KL", stationCount: 310, cityCount: 5, latitude: 10.8505, longitude: 76.2711 },
  { id: "st-punjab", name: "Punjab", slug: "punjab", code: "PB", stationCount: 220, cityCount: 4, latitude: 31.1471, longitude: 75.3412 },
  { id: "st-west-bengal", name: "West Bengal", slug: "west-bengal", code: "WB", stationCount: 260, cityCount: 4, latitude: 22.9868, longitude: 87.855 },
];

export const MOCK_CITIES: MockCity[] = [
  { id: "city-delhi", name: "Delhi", slug: "delhi", stateName: "Delhi", stateSlug: "delhi", stationCount: 420, fastChargerCount: 280, latitude: 28.6139, longitude: 77.209, popularPincodes: ["110001", "110020", "110037", "110017"] },
  { id: "city-mumbai", name: "Mumbai", slug: "mumbai", stateName: "Maharashtra", stateSlug: "maharashtra", stationCount: 390, fastChargerCount: 240, latitude: 19.076, longitude: 72.8777, popularPincodes: ["400001", "400051", "400013", "400069"] },
  { id: "city-bengaluru", name: "Bengaluru", slug: "bengaluru", stateName: "Karnataka", stateSlug: "karnataka", stationCount: 380, fastChargerCount: 260, latitude: 12.9716, longitude: 77.5946, popularPincodes: ["560001", "560034", "560038", "560100"] },
  { id: "city-gurugram", name: "Gurugram", slug: "gurugram", stateName: "Haryana", stateSlug: "haryana", stationCount: 210, fastChargerCount: 150, latitude: 28.4595, longitude: 77.0266, popularPincodes: ["122001", "122002", "122011", "122018"] },
  { id: "city-hyderabad", name: "Hyderabad", slug: "hyderabad", stateName: "Telangana", stateSlug: "telangana", stationCount: 260, fastChargerCount: 180, latitude: 17.385, longitude: 78.4867, popularPincodes: ["500001", "500032", "500081", "500034"] },
  { id: "city-pune", name: "Pune", slug: "pune", stateName: "Maharashtra", stateSlug: "maharashtra", stationCount: 190, fastChargerCount: 120, latitude: 18.5204, longitude: 73.8567, popularPincodes: ["411001", "411045", "411014", "411057"] },
  { id: "city-chandigarh", name: "Chandigarh", slug: "chandigarh", stateName: "Punjab", stateSlug: "punjab", stationCount: 110, fastChargerCount: 75, latitude: 30.7333, longitude: 76.7794, popularPincodes: ["160017", "160022", "160036"] },
  { id: "city-chennai", name: "Chennai", slug: "chennai", stateName: "Tamil Nadu", stateSlug: "tamil-nadu", stationCount: 230, fastChargerCount: 140, latitude: 13.0827, longitude: 80.2707, popularPincodes: ["600001", "600040", "600096", "600028"] },
  { id: "city-ahmedabad", name: "Ahmedabad", slug: "ahmedabad", stateName: "Gujarat", stateSlug: "gujarat", stationCount: 170, fastChargerCount: 110, latitude: 23.0225, longitude: 72.5714, popularPincodes: ["380001", "380054", "380015"] },
  { id: "city-noida", name: "Noida", slug: "noida", stateName: "Uttar Pradesh", stateSlug: "uttar-pradesh", stationCount: 160, fastChargerCount: 105, latitude: 28.5355, longitude: 77.391, popularPincodes: ["201301", "201304", "201307"] },
  { id: "city-jaipur", name: "Jaipur", slug: "jaipur", stateName: "Rajasthan", stateSlug: "rajasthan", stationCount: 130, fastChargerCount: 80, latitude: 26.9124, longitude: 75.7873, popularPincodes: ["302001", "302017", "302020"] },
  { id: "city-kochi", name: "Kochi", slug: "kochi", stateName: "Kerala", stateSlug: "kerala", stationCount: 120, fastChargerCount: 70, latitude: 9.9312, longitude: 76.2673, popularPincodes: ["682001", "682016", "682024"] },
];

export const MOCK_OPERATORS: MockOperator[] = [
  { id: "op-tata", name: "Tata Power EZ Charge", slug: "tata-power", stationCount: 1450, website: "https://www.tatapower.com/evcharging" },
  { id: "op-statiq", name: "Statiq", slug: "statiq", stationCount: 920, website: "https://www.statiq.in" },
  { id: "op-jio-bp", name: "Jio-bp pulse", slug: "jio-bp-pulse", stationCount: 780, website: "https://www.jiobp.com" },
  { id: "op-ather", name: "Ather Grid", slug: "ather-grid", stationCount: 620, website: "https://www.atherenergy.com" },
  { id: "op-chargezone", name: "ChargeZone", slug: "chargezone", stationCount: 540, website: "https://www.chargezone.com" },
  { id: "op-zeon", name: "Zeon Charging", slug: "zeon-charging", stationCount: 410, website: "https://www.zeoncharging.com" },
  { id: "op-fortum", name: "Fortum Charge & Drive", slug: "fortum-charge-drive", stationCount: 290, website: "https://www.fortum.in" },
  { id: "op-magenta", name: "Magenta EV", slug: "magenta-ev", stationCount: 210, website: "https://www.chargenet.in" },
];

export const MOCK_STATIONS: MockStation[] = [
  {
    id: "st-del-01",
    ocmId: 284101,
    slug: "tata-power-aerocity-fast-charging-hub-delhi",
    name: "Tata Power - Aerocity Rapid Charging Hub",
    operator: { id: "op-tata", name: "Tata Power EZ Charge", slug: "tata-power", website: "https://www.tatapower.com" },
    address: "Worldmark 2, Asset 8, Hospitality District, Aerocity, New Delhi",
    city: { name: "Delhi", slug: "delhi" },
    state: { name: "Delhi", slug: "delhi", code: "DL" },
    district: "South West Delhi",
    pincode: "110037",
    latitude: 28.5501,
    longitude: 77.1219,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284101",
    lastUpdated: "12 minutes ago",
    fastestPowerKw: 120,
    connectors: [
      { id: "c-1", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 120, voltage: 400, amps: 300, status: "available", quantity: 4 },
      { id: "c-2", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-del-02",
    ocmId: 284102,
    slug: "statiq-connaught-place-supercharger-delhi",
    name: "Statiq - Connaught Place Outer Circle",
    operator: { id: "op-statiq", name: "Statiq", slug: "statiq", website: "https://www.statiq.in" },
    address: "Radial Road 4, Near Janpath Metro, CP Outer Circle, New Delhi",
    city: { name: "Delhi", slug: "delhi" },
    state: { name: "Delhi", slug: "delhi", code: "DL" },
    district: "New Delhi",
    pincode: "110001",
    latitude: 28.6289,
    longitude: 77.2185,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (Paid Parking)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284102",
    lastUpdated: "35 minutes ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-3", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "available", quantity: 2 },
      { id: "c-4", type: "CHAdeMO", normalizedType: "chademo", powerKw: 50, voltage: 400, amps: 125, status: "busy", quantity: 1 },
    ],
  },
  {
    id: "st-mum-01",
    ocmId: 284103,
    slug: "jio-bp-pulse-bkc-bandra-kurla-hub-mumbai",
    name: "Jio-bp pulse - Bandra Kurla Complex Hub",
    operator: { id: "op-jio-bp", name: "Jio-bp pulse", slug: "jio-bp-pulse", website: "https://www.jiobp.com" },
    address: "G Block, Near Jio World Centre, Bandra Kurla Complex, Mumbai",
    city: { name: "Mumbai", slug: "mumbai" },
    state: { name: "Maharashtra", slug: "maharashtra", code: "MH" },
    district: "Mumbai Suburban",
    pincode: "400051",
    latitude: 19.0664,
    longitude: 72.8687,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284103",
    lastUpdated: "5 minutes ago",
    fastestPowerKw: 150,
    connectors: [
      { id: "c-5", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 150, voltage: 800, amps: 200, status: "available", quantity: 6 },
      { id: "c-6", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-mum-02",
    ocmId: 284104,
    slug: "chargezone-phoenix-palladium-lower-parel-mumbai",
    name: "ChargeZone - Phoenix Palladium Lower Parel",
    operator: { id: "op-chargezone", name: "ChargeZone", slug: "chargezone", website: "https://www.chargezone.com" },
    address: "Basement 2, High Street Phoenix, 462 Senapati Bapat Marg, Lower Parel, Mumbai",
    city: { name: "Mumbai", slug: "mumbai" },
    state: { name: "Maharashtra", slug: "maharashtra", code: "MH" },
    district: "Mumbai City",
    pincode: "400013",
    latitude: 18.9953,
    longitude: 72.8242,
    status: "Operational",
    operationalStatus: "busy",
    usageType: "Public (Mall Hours)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284104",
    lastUpdated: "1 hour ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-7", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "busy", quantity: 2 },
      { id: "c-8", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-blr-01",
    ocmId: 284105,
    slug: "zeon-charging-indiranagar-100ft-road-bengaluru",
    name: "Zeon Charging - Indiranagar 100ft Road",
    operator: { id: "op-zeon", name: "Zeon Charging", slug: "zeon-charging", website: "https://www.zeoncharging.com" },
    address: "777/A, 100 Feet Rd, HAL 2nd Stage, Doopanahalli, Indiranagar, Bengaluru",
    city: { name: "Bengaluru", slug: "bengaluru" },
    state: { name: "Karnataka", slug: "karnataka", code: "KA" },
    district: "Bengaluru Urban",
    pincode: "560038",
    latitude: 12.9719,
    longitude: 77.6412,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284105",
    lastUpdated: "18 minutes ago",
    fastestPowerKw: 120,
    connectors: [
      { id: "c-9", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 120, voltage: 400, amps: 300, status: "available", quantity: 4 },
      { id: "c-10", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-blr-02",
    ocmId: 284106,
    slug: "tata-power-electronic-city-phase-1-bengaluru",
    name: "Tata Power - Electronic City Tech Park Hub",
    operator: { id: "op-tata", name: "Tata Power EZ Charge", slug: "tata-power", website: "https://www.tatapower.com" },
    address: "Hosur Road, Velankani Tech Park Gate 2, Electronic City Phase 1, Bengaluru",
    city: { name: "Bengaluru", slug: "bengaluru" },
    state: { name: "Karnataka", slug: "karnataka", code: "KA" },
    district: "Bengaluru Urban",
    pincode: "560100",
    latitude: 12.8452,
    longitude: 77.6602,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284106",
    lastUpdated: "25 minutes ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-11", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "available", quantity: 2 },
      { id: "c-12", type: "GB/T", normalizedType: "gbt", powerKw: 15, voltage: 230, amps: 63, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-ggn-01",
    ocmId: 284107,
    slug: "statiq-cyber-hub-rapid-charger-gurugram",
    name: "Statiq - DLF Cyber City Rapid Hub",
    operator: { id: "op-statiq", name: "Statiq", slug: "statiq", website: "https://www.statiq.in" },
    address: "Building 10 Parking Plaza, DLF Cyber City, Sector 24, Gurugram",
    city: { name: "Gurugram", slug: "gurugram" },
    state: { name: "Haryana", slug: "haryana", code: "HR" },
    district: "Gurugram",
    pincode: "122002",
    latitude: 28.4952,
    longitude: 77.0894,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284107",
    lastUpdated: "40 minutes ago",
    fastestPowerKw: 120,
    connectors: [
      { id: "c-13", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 120, voltage: 400, amps: 300, status: "available", quantity: 4 },
      { id: "c-14", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-hyd-01",
    ocmId: 284108,
    slug: "tata-power-gachibowli-financial-district-hyderabad",
    name: "Tata Power - Financial District Fast Hub",
    operator: { id: "op-tata", name: "Tata Power EZ Charge", slug: "tata-power", website: "https://www.tatapower.com" },
    address: "Nanakramguda, Financial District, Near Waverock, Gachibowli, Hyderabad",
    city: { name: "Hyderabad", slug: "hyderabad" },
    state: { name: "Telangana", slug: "telangana", code: "TS" },
    district: "Rangareddy",
    pincode: "500032",
    latitude: 17.4156,
    longitude: 78.3427,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284108",
    lastUpdated: "10 minutes ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-15", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "available", quantity: 2 },
      { id: "c-16", type: "Type 2 (Socket)", normalizedType: "type2", powerKw: 22, voltage: 230, amps: 32, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-pun-01",
    ocmId: 284109,
    slug: "chargezone-baner-high-street-pune",
    name: "ChargeZone - Baner Balewadi High Street",
    operator: { id: "op-chargezone", name: "ChargeZone", slug: "chargezone", website: "https://www.chargezone.com" },
    address: "Balewadi High St, Laxman Nagar, Baner, Pune",
    city: { name: "Pune", slug: "pune" },
    state: { name: "Maharashtra", slug: "maharashtra", code: "MH" },
    district: "Pune",
    pincode: "411045",
    latitude: 18.5726,
    longitude: 73.7745,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284109",
    lastUpdated: "50 minutes ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-17", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-chn-01",
    ocmId: 284110,
    slug: "tata-power-anna-nagar-west-hub-chennai",
    name: "Tata Power - Anna Nagar West Hub",
    operator: { id: "op-tata", name: "Tata Power EZ Charge", slug: "tata-power", website: "https://www.tatapower.com" },
    address: "2nd Avenue, Near Roundtana, Anna Nagar West, Chennai",
    city: { name: "Chennai", slug: "chennai" },
    state: { name: "Tamil Nadu", slug: "tamil-nadu", code: "TN" },
    district: "Chennai",
    pincode: "600040",
    latitude: 13.0878,
    longitude: 80.2091,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284110",
    lastUpdated: "1 hour ago",
    fastestPowerKw: 60,
    connectors: [
      { id: "c-18", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 60, voltage: 400, amps: 150, status: "available", quantity: 2 },
    ],
  },
  {
    id: "st-chd-01",
    ocmId: 284111,
    slug: "zeon-charging-sector-17-plaza-chandigarh",
    name: "Zeon Charging - Sector 17 Commercial Plaza",
    operator: { id: "op-zeon", name: "Zeon Charging", slug: "zeon-charging", website: "https://www.zeoncharging.com" },
    address: "Multi-level Parking, Sector 17C, Chandigarh",
    city: { name: "Chandigarh", slug: "chandigarh" },
    state: { name: "Punjab", slug: "punjab", code: "PB" },
    district: "Chandigarh",
    pincode: "160017",
    latitude: 30.7415,
    longitude: 76.7849,
    status: "Operational",
    operationalStatus: "available",
    usageType: "Public (24/7 Access)",
    dataProvider: "Open Charge Map",
    dataLicense: "CC BY-SA 4.0",
    ocmUrl: "https://openchargemap.org/site/poi/details/284111",
    lastUpdated: "3 hours ago",
    fastestPowerKw: 120,
    connectors: [
      { id: "c-19", type: "CCS (Type 2)", normalizedType: "ccs2", powerKw: 120, voltage: 400, amps: 300, status: "available", quantity: 2 },
    ],
  },
];
