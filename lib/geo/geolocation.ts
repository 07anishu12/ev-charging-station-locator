export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export type GeolocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "timeout"
  | "unavailable"
  | "unsupported";

export interface GeolocationState {
  status: GeolocationStatus;
  location: UserLocation | null;
  errorMessage: string | null;
}

// In-memory session cache for user location
let cachedUserLocation: UserLocation | null = null;

export function getCachedUserLocation(): UserLocation | null {
  return cachedUserLocation;
}

export function setCachedUserLocation(loc: UserLocation | null): void {
  cachedUserLocation = loc;
}

export function clearCachedUserLocation(): void {
  cachedUserLocation = null;
}

export const PRIMARY_EV_HUBS = [
  { name: "Delhi NCR", citySlug: "delhi", lat: 28.6139, lng: 77.209 },
  { name: "Bengaluru", citySlug: "bengaluru", lat: 12.9716, lng: 77.5946 },
  { name: "Mumbai", citySlug: "mumbai", lat: 19.076, lng: 72.8777 },
] as const;

/**
 * Requests the user's location via the browser Geolocation API.
 * Uses cached location if already acquired during this session.
 * Features automatic fallback from high-accuracy to standard accuracy
 * for desktop and laptop environments.
 */
export async function requestUserLocation(
  forceFresh = false,
): Promise<
  | { success: true; location: UserLocation; fromCache: boolean }
  | { success: false; status: GeolocationStatus; error: string }
> {
  // 1. Return cached location if available and not forced
  if (!forceFresh && cachedUserLocation) {
    return { success: true, location: cachedUserLocation, fromCache: true };
  }

  // 2. Check browser support
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      success: false,
      status: "unsupported",
      error: "Geolocation is not supported by your browser.",
    };
  }

  // 3. Request location with standard timeouts & low-accuracy fallback
  return new Promise((resolve) => {
    const handleSuccess = (pos: GeolocationPosition) => {
      const loc: UserLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      cachedUserLocation = loc;
      resolve({ success: true, location: loc, fromCache: false });
    };

    const handleError = (err: GeolocationPositionError, isRetry = false) => {
      // If high accuracy failed with TIMEOUT or POSITION_UNAVAILABLE, retry with low accuracy
      if (!isRetry && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (retryErr) => handleError(retryErr, true),
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
        );
        return;
      }

      let status: GeolocationStatus = "unavailable";
      let message = "Couldn't determine your location.";

      if (err.code === err.PERMISSION_DENIED) {
        status = "denied";
        message = "Location access is required to find chargers near you.";
      } else if (err.code === err.TIMEOUT) {
        status = "timeout";
        message = "Couldn't determine your location. Try again.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        status = "unavailable";
        message = "Location information is unavailable.";
      }

      resolve({ success: false, status, error: message });
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => handleError(err, false),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      },
    );
  });
}
