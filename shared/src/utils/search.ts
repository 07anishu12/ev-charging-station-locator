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
