import "server-only";

import { createChargingDataProvider } from "@/services/providers";

export async function ingestStations() {
  const provider = createChargingDataProvider();
  const stations = await provider.fetchStations();

  // Persistence is intentionally not implemented in Phase 1. The provider and
  // normalization boundaries are ready for a PostGIS-backed writer in Phase 2.
  return { provider: "open-charge-map", stations };
}
