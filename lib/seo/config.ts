/**
 * SEO & GEO Configuration for FastCharger
 * Canonical URLs, metadata constants, and base URL resolution.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://fastcharger.in");

export const SITE_NAME = "FastCharger";

export const DEFAULT_TITLE = "FastCharger | Find your next charging stop.";

export const DEFAULT_DESCRIPTION =
  "Discover EV charging stations across India. Locate fast DC chargers, verify connector compatibility, and get instant directions.";

/**
 * Returns a fully qualified canonical URL for a given relative route path.
 */
export function absoluteUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
