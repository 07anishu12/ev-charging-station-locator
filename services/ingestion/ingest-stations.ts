import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  cities,
  cityAliases,
  connectors,
  dataQualityIssues,
  operators,
  states,
  stations,
  syncLogs,
} from "@/lib/db/schema";
import { createSlug } from "@/lib/search/slug";
import { createChargingDataProvider } from "@/services/providers";
import type { ChargingDataProvider, ProviderStation } from "@/types/providers";

export interface IngestStationsOptions {
  provider?: ChargingDataProvider;
  pageSize?: number;
  maxResults?: number;
  db?: ReturnType<typeof getDb>;
}

export interface SyncResult {
  syncLogId: string;
  source: string;
  country: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  operatorsCount: number;
  stationsCount: number;
  connectorsCount: number;
  dataQualityIssuesCount: number;
  durationSeconds: number;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function validateIndianPincode(
  pincode?: string | null,
): { valid: boolean; pincode: string | null } {
  if (!pincode) return { valid: true, pincode: null };
  const cleaned = pincode.replace(/\s+/g, "").trim();
  if (/^\d{6}$/.test(cleaned)) {
    return { valid: true, pincode: cleaned };
  }
  return { valid: false, pincode: null };
}

export function generateStationSlug(
  name: string | null,
  cityOrState: string | null,
  ocmId: number,
): string {
  const baseName = name?.trim() || "charging-station";
  const locationPart = cityOrState?.trim() || "";
  const candidate = locationPart ? `${baseName}-${locationPart}-${ocmId}` : `${baseName}-${ocmId}`;
  return createSlug(candidate);
}

export async function ingestStations(options: IngestStationsOptions = {}): Promise<SyncResult> {
  const startTime = Date.now();
  const db = options.db ?? getDb();
  const provider = options.provider ?? createChargingDataProvider();

  // 1. Initialize Sync Log
  const [initialLog] = await db
    .insert(syncLogs)
    .values({
      source: "open-charge-map",
      country: "IN",
      status: "running",
      startedAt: new Date(),
      recordsFetched: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errorCount: 0,
    })
    .returning();

  const syncLogId = initialLog.id;

  let recordsFetched = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;
  let totalIssuesCount = 0;
  let totalConnectorsCount = 0;

  try {
    // 2. Fetch stations from provider
    const fetchedStations: ProviderStation[] = await provider.fetchStations({
      maxResults: options.maxResults ?? 10000,
      pageSize: options.pageSize ?? 10000,
    });
    recordsFetched = fetchedStations.length;

    // 3. Preload reference caches to avoid N+1 queries
    const [existingStates, existingCities, existingAliases, existingOperators, existingStations] =
      await Promise.all([
        db.select({ id: states.id, name: states.name, slug: states.slug, code: states.code }).from(states),
        db.select({ id: cities.id, name: cities.name, slug: cities.slug }).from(cities),
        db.select({ alias: cityAliases.alias, cityId: cityAliases.cityId }).from(cityAliases),
        db.select({ id: operators.id, slug: operators.slug }).from(operators),
        db.select({ id: stations.id, ocmId: stations.ocmId, slug: stations.slug }).from(stations),
      ]);

    const stateMap = new Map<string, string>();
    for (const s of existingStates) {
      stateMap.set(s.slug.toLowerCase(), s.id);
      stateMap.set(s.name.toLowerCase(), s.id);
      if (s.code) stateMap.set(s.code.toLowerCase(), s.id);
    }

    const cityMap = new Map<string, string>();
    for (const c of existingCities) {
      cityMap.set(c.slug.toLowerCase(), c.id);
      cityMap.set(c.name.toLowerCase(), c.id);
    }
    for (const a of existingAliases) {
      cityMap.set(a.alias.toLowerCase(), a.cityId);
    }

    const operatorMap = new Map<string, string>();
    for (const op of existingOperators) {
      operatorMap.set(op.slug, op.id);
    }

    const existingStationMap = new Map<number, { id: string; slug: string }>();
    for (const st of existingStations) {
      if (st.ocmId !== null) {
        existingStationMap.set(st.ocmId, { id: st.id, slug: st.slug });
      }
    }

    // 4. Process each station record
    for (const station of fetchedStations) {
      try {
        const issues: Array<{
          issueType: string;
          severity: string;
          description: string;
          details?: Record<string, unknown>;
        }> = [];

        // Validate Coordinates
        if (!isValidCoordinate(station.latitude, station.longitude)) {
          issues.push({
            issueType: "invalid_coordinates",
            severity: "error",
            description: `Invalid coordinates: latitude=${station.latitude}, longitude=${station.longitude}`,
            details: { latitude: station.latitude, longitude: station.longitude },
          });

          // Insert data quality issues for skipped station
          for (const issue of issues) {
            await db.insert(dataQualityIssues).values({
              ocmId: station.ocmId,
              issueType: issue.issueType,
              severity: issue.severity,
              description: issue.description,
              details: issue.details,
            });
            totalIssuesCount++;
          }

          recordsSkipped++;
          continue;
        }

        // Validate PIN code
        const pinCheck = validateIndianPincode(station.pincode);
        if (!pinCheck.valid) {
          issues.push({
            issueType: "invalid_pincode",
            severity: "warning",
            description: `Supplied PIN code '${station.pincode}' is not a valid 6-digit Indian postal code.`,
            details: { rawPincode: station.pincode },
          });
        }

        // Validate Station Name
        if (!station.name) {
          issues.push({
            issueType: "missing_station_name",
            severity: "warning",
            description: "Station name was not provided by the provider.",
          });
        }

        // Check Status
        if (station.status === "unknown") {
          issues.push({
            issueType: "unknown_status",
            severity: "info",
            description: "Station status is unknown or unspecified.",
          });
        }

        // Check Connectors
        if (!station.connectors || station.connectors.length === 0) {
          issues.push({
            issueType: "missing_connector",
            severity: "warning",
            description: "No connectors were listed for this station.",
          });
        }

        // Resolve State
        let stateId: string | null = null;
        if (station.state) {
          const cleanState = station.state.trim().toLowerCase();
          const slugifiedState = createSlug(station.state);
          stateId = stateMap.get(cleanState) ?? stateMap.get(slugifiedState) ?? null;
          if (!stateId) {
            issues.push({
              issueType: "unresolved_state",
              severity: "info",
              description: `State '${station.state}' could not be matched to an existing state record.`,
              details: { state: station.state },
            });
          }
        }

        // Resolve City
        let cityId: string | null = null;
        if (station.city) {
          const cleanCity = station.city.trim().toLowerCase();
          const slugifiedCity = createSlug(station.city);
          cityId = cityMap.get(cleanCity) ?? cityMap.get(slugifiedCity) ?? null;
          if (!cityId) {
            issues.push({
              issueType: "unresolved_city",
              severity: "info",
              description: `City '${station.city}' could not be matched to an existing city record or alias.`,
              details: { city: station.city },
            });
          }
        }

        // Resolve / Upsert Operator
        let operatorId: string | null = null;
        if (station.operatorName) {
          const opSlug = createSlug(station.operatorName);
          if (operatorMap.has(opSlug)) {
            operatorId = operatorMap.get(opSlug)!;
          } else {
            const [newOperator] = await db
              .insert(operators)
              .values({
                name: station.operatorName,
                slug: opSlug,
                website: station.operatorWebsite,
              })
              .onConflictDoUpdate({
                target: operators.slug,
                set: {
                  name: station.operatorName,
                  website:
                    station.operatorWebsite ??
                    sql`COALESCE(${operators.website}, ${station.operatorWebsite})`,
                  updatedAt: new Date(),
                },
              })
              .returning({ id: operators.id });

            if (newOperator) {
              operatorId = newOperator.id;
              operatorMap.set(opSlug, newOperator.id);
            }
          }
        } else {
          issues.push({
            issueType: "missing_operator",
            severity: "info",
            description: "Station does not have an identified operator.",
          });
        }

        // Slug Determination (idempotent, preserve existing slug)
        const isExisting = existingStationMap.has(station.ocmId);
        const stationSlug = isExisting
          ? existingStationMap.get(station.ocmId)!.slug
          : generateStationSlug(station.name, station.city || station.state, station.ocmId);

        // Upsert Station
        const [upsertedStation] = await db
          .insert(stations)
          .values({
            ocmId: station.ocmId,
            externalId: station.externalId,
            name: station.name || "EV Charging Station",
            slug: stationSlug,
            operatorId,
            address: station.address,
            cityId,
            stateId,
            district: station.district || station.city,
            pincode: pinCheck.pincode,
            latitude: station.latitude,
            longitude: station.longitude,
            location: sql`ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)`,
            status: station.status,
            usageType: station.usageType,
            dataProvider: station.dataProvider || "Open Charge Map",
            dataLicense: station.dataLicense,
            ocmUrl: station.ocmUrl,
            lastVerifiedAt: station.lastVerifiedAt,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: stations.ocmId,
            set: {
              name: station.name || "EV Charging Station",
              operatorId,
              address: station.address,
              cityId: cityId ?? sql`${stations.cityId}`,
              stateId: stateId ?? sql`${stations.stateId}`,
              district: station.district || station.city || sql`${stations.district}`,
              pincode: pinCheck.pincode ?? sql`${stations.pincode}`,
              latitude: station.latitude,
              longitude: station.longitude,
              location: sql`ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)`,
              status: station.status,
              usageType: station.usageType,
              dataLicense: station.dataLicense,
              ocmUrl: station.ocmUrl,
              lastVerifiedAt: station.lastVerifiedAt ?? sql`${stations.lastVerifiedAt}`,
              lastSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          })
          .returning({ id: stations.id });

        existingStationMap.set(station.ocmId, { id: upsertedStation.id, slug: stationSlug });

        if (isExisting) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }

        // Upsert Connectors
        for (const conn of station.connectors) {
          if (conn.ocmConnectionId !== null) {
            await db
              .insert(connectors)
              .values({
                stationId: upsertedStation.id,
                ocmConnectionId: conn.ocmConnectionId,
                connectionType: conn.type,
                normalizedType: conn.normalizedType,
                level: conn.level,
                powerKw: conn.powerKw !== null ? String(conn.powerKw) : null,
                voltage: conn.voltage,
                amps: conn.amps,
                status: conn.status,
                quantity: conn.quantity,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: connectors.ocmConnectionId,
                set: {
                  stationId: upsertedStation.id,
                  connectionType: conn.type,
                  normalizedType: conn.normalizedType,
                  level: conn.level,
                  powerKw: conn.powerKw !== null ? String(conn.powerKw) : null,
                  voltage: conn.voltage,
                  amps: conn.amps,
                  status: conn.status,
                  quantity: conn.quantity,
                  updatedAt: new Date(),
                },
              });
          } else {
            await db.insert(connectors).values({
              stationId: upsertedStation.id,
              connectionType: conn.type,
              normalizedType: conn.normalizedType,
              level: conn.level,
              powerKw: conn.powerKw !== null ? String(conn.powerKw) : null,
              voltage: conn.voltage,
              amps: conn.amps,
              status: conn.status,
              quantity: conn.quantity,
            });
          }
          totalConnectorsCount++;
        }

        // Record Data Quality Issues
        for (const issue of issues) {
          await db.insert(dataQualityIssues).values({
            stationId: upsertedStation.id,
            ocmId: station.ocmId,
            issueType: issue.issueType,
            severity: issue.severity,
            description: issue.description,
            details: issue.details,
          });
          totalIssuesCount++;
        }
      } catch (recordError) {
        recordsFailed++;
        const errorMessage =
          recordError instanceof Error ? recordError.message : "Unknown error processing station record";

        try {
          await db.insert(dataQualityIssues).values({
            ocmId: station.ocmId,
            issueType: "ingestion_record_error",
            severity: "error",
            description: `Failed to persist station ${station.ocmId}: ${errorMessage}`,
            details: { error: errorMessage },
          });
          totalIssuesCount++;
        } catch {
          // Ignore secondary logging failure to avoid cascading
        }
      }
    }

    // 5. Complete Sync Log
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    await db
      .update(syncLogs)
      .set({
        completedAt: new Date(),
        recordsFetched,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsFailed,
        errorCount: recordsFailed,
        status: "completed",
        details: {
          durationSeconds,
          operatorsCount: operatorMap.size,
          connectorsCount: totalConnectorsCount,
          dataQualityIssuesCount: totalIssuesCount,
        },
      })
      .where(sql`${syncLogs.id} = ${syncLogId}`);

    return {
      syncLogId,
      source: "Open Charge Map",
      country: "India",
      fetched: recordsFetched,
      created: recordsCreated,
      updated: recordsUpdated,
      skipped: recordsSkipped,
      failed: recordsFailed,
      operatorsCount: operatorMap.size,
      stationsCount: existingStationMap.size,
      connectorsCount: totalConnectorsCount,
      dataQualityIssuesCount: totalIssuesCount,
      durationSeconds,
    };
  } catch (fatalError) {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const errorMessage =
      fatalError instanceof Error ? fatalError.message : "Fatal error during India sync";

    await db
      .update(syncLogs)
      .set({
        completedAt: new Date(),
        recordsFetched,
        recordsCreated,
        recordsUpdated,
        recordsSkipped,
        recordsFailed: recordsFailed + 1,
        errorCount: recordsFailed + 1,
        status: "failed",
        details: {
          error: errorMessage,
          durationSeconds,
        },
      })
      .where(sql`${syncLogs.id} = ${syncLogId}`)
      .catch(() => {});

    throw fatalError;
  }
}
