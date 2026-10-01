import "server-only";

import { OpenChargeMapProvider } from "./open-charge-map";

export function createChargingDataProvider() {
  return new OpenChargeMapProvider();
}
