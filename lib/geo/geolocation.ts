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

/**
 * Requests the user's location via the browser Geolocation API.
 * Uses cached location if already acquired during this session.
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

  // 3. Request location with standard timeouts
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        cachedUserLocation = loc;
        resolve({ success: true, location: loc, fromCache: false });
      },
      (err) => {
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
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  });
}
