/**
 * FastCharger Independent Durable Ingestion System
 *
 * PIPELINE:
 * Provider
 * → Raw Archive (Object Storage & PostgreSQL object_metadata)
 * → Validation (Fatal vs Warning anomalies without breaking complete batch)
 * → Normalization (Canonical Plug Types, Power, Status)
 * → Identity Resolution (Provider Mappings + 25m Spatial Proximity + Deterministic Slugs)
 * → PostgreSQL/PostGIS (Authoritative Source of Truth, Spatial Points, Upsert Semantics)
 * → Events (Flexible MongoDB Operational & Audit Event Layer, Failure Isolated)
 * → Cache Invalidation (Redis Key Deletion with Graceful Fallback)
 *
 * OBSERVABILITY:
 * Every run produces:
 * run ID, provider, started, completed, received, validated, rejected, inserted, updated, duplicates, errors
 */

import { randomUUID } from "node:crypto";
import { findSpatialIdentity, provenanceFor, recordOperationalObservation, resolveGeography, stationFingerprint } from "./reconciliation";
import { validIndiaCoordinates } from "../providers/research";
import { sql } from "drizzle-orm";
import {
  auditStationQuality,
  cities,
  cityAliases,
  connectors,
  DATA_QUALITY_ISSUE_TYPES,
  dataQualityIssues,
  EVENT_TYPES,
  generateDeterministicStationSlug,
  getDb,
  getEventStore,
  isProximityDuplicate,
  isValidCoordinate,
  objectMetadata,
  operators,
  states,
  stationProviderMappings,
  stations,
  syncLogs,
  validateIndianPincode,
} from "@fastcharger/database";
import {
  CANONICAL_CITIES,
  CANONICAL_PINCODES,
  createSlug,
  resolveCanonicalCity,
  resolveCanonicalState,
  type ChargingDataProvider,
  type ProviderStation,
} from "@fastcharger/shared";
import { getRawProviderArchivalService, RawProviderArchivalService, LocalObjectStorageClient } from "@fastcharger/storage";
import { getCacheInvalidator, type CacheInvalidator } from "../cache";
import { createChargingDataProvider, type ProviderAdapter } from "../providers";

export interface IngestStationsOptions {
  provider?: ChargingDataProvider | ProviderAdapter;
  pageSize?: number;
  maxResults?: number;
  db?: ReturnType<typeof getDb>;
  archivalService?: RawProviderArchivalService;
  cacheInvalidator?: CacheInvalidator;
  useTransaction?: boolean;
  skipRawArchive?: boolean;
  runId?: string;
  fullSnapshot?: boolean;
}

export interface IngestionRunResult {
  // Exact Observability Contract
  runId: string;
  provider: string;
  started: Date;
  completed: Date;
  received: number;
  validated: number;
  rejected: number;
  inserted: number;
  updated: number;
  duplicates: number;
  unchanged: number;
  missing: number;
  statusUpdates: number;
  statusChanges?: number;
  errors: number;

  // Backwards-Compatible SyncResult
  syncLogId: string;
  source: string;
  country: string;
  fetched: number;
  created: number;
  skipped: number;
  failed: number;
  operatorsCount: number;
  stationsCount: number;
  connectorsCount: number;
  dataQualityIssuesCount: number;
  durationSeconds: number;
  archivedObjectKey?: string | null;
}

// Backwards-compatibility re-exports
export { isValidCoordinate, validateIndianPincode };

export function generateStationSlug(
  name: string | null,
  cityOrState: string | null,
  ocmId: number,
): string {
  return generateDeterministicStationSlug({
    name,
    cityOrDistrict: cityOrState,
    providerName: "ocm",
    providerStationId: ocmId,
  });
}

function isProviderAdapter(provider: unknown): provider is ProviderAdapter {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "fetchRawStations" in provider &&
    typeof (provider as ProviderAdapter).fetchRawStations === "function"
  );
}

export function isFatalTransactionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes("fatal") ||
    msg.includes("transaction is aborted") ||
    msg.includes("deadlock detected") ||
    msg.includes("connection closed") ||
    msg.includes("econnrefused") ||
    msg.includes("terminating connection")
  );
}

export async function ingestStations(options: IngestStationsOptions = {}): Promise<IngestionRunResult> {
  const started = new Date();
  const runId = options.runId ?? randomUUID();
  const db = options.db ?? getDb();
  const provider = options.provider ?? createChargingDataProvider();
  const archivalService = options.archivalService ?? (process.env.STORAGE_PROVIDER ? getRawProviderArchivalService() : new RawProviderArchivalService(new LocalObjectStorageClient()));
  const cacheInvalidator = options.cacheInvalidator ?? getCacheInvalidator();
  const eventStore = getEventStore();

  const providerName =
    "providerName" in provider && typeof provider.providerName === "string"
      ? provider.providerName
      : "open-charge-map";

  // Observability Counters
  let received = 0;
  let validated = 0;
  let rejected = 0;
  let inserted = 0;
  let updated = 0;
  let duplicates = 0;
  let errors = 0;
  let unchanged = 0;
  let missing = 0;
  let statusUpdates = 0;
  let statusChanges = 0;
  let completeSnapshot = false;
  const acquisitionMetadata:Record<string,unknown>={};
  let cacheInvalidation:{success:boolean;skipped?:boolean;error?:string}|undefined;
  let totalConnectorsCount = 0;
  let totalIssuesCount = 0;
  let archivedObjectKey: string | null = null;

  const affectedStationSlugs = new Set<string>();
  const affectedCitySlugs = new Set<string>();
  const affectedStateSlugs = new Set<string>();
  const affectedPincodes = new Set<string>();

  // 1. Initial Sync Log in PostgreSQL (Authoritative Status Tracking)
  let syncLogId = runId;
  try {
    const [initialLog] = await db
      .insert(syncLogs)
      .values({
        source: providerName,
        country: "IN",
        status: "running",
        startedAt: started,
        recordsFetched: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsFailed: 0,
        errorCount: 0,
        details: { runId },
        fullSnapshot: options.fullSnapshot ?? false,
      })
      .returning();
    if (initialLog) syncLogId = initialLog.id;
  } catch (error) { throw error; }

  // Record Ingestion Started Event (MongoDB Event Layer)
  try {
    await eventStore.recordEvent("ingestion_events", {
      eventId: `evt-start-${runId}`,
      eventType: EVENT_TYPES.INGESTION_STARTED,
      timestamp: started,
      source: "worker-ingestion",
      correlationId: runId,
      payload: {
        runId,
        provider: providerName,
        startedAt: started.toISOString(),
        pageSize: options.pageSize,
        maxResults: options.maxResults,
      },
      version: 1,
    });
  } catch {
    // Event store failure does not fail core ingestion
  }

  try {
    // =========================================================================
    // STAGE 1: PROVIDER INGESTION & RAW FETCH
    // =========================================================================
    let rawPayloadItems: unknown[] = [];
    let candidateStations: ProviderStation[] = [];

    if (isProviderAdapter(provider)) {
      const rawResult = await provider.fetchRawStations({
        maxResults: options.maxResults ?? 10000,
        pageSize: options.pageSize ?? 10000,
      });
      rawPayloadItems = Array.isArray(rawResult.data) ? rawResult.data : [];
      received = rawPayloadItems.length;
      const metadata=rawResult.metadata??{};
      for(const key of ['countryCode','pageSize','fullSnapshot','httpStatus','rawPdfArchive','rawPdfChecksumSha256','rawPdfSizeBytes','sourceUrl','extractionErrors']) {
        if(metadata[key]!==undefined)acquisitionMetadata[key]=metadata[key];
      }
      completeSnapshot = options.fullSnapshot === true && rawResult.metadata?.fullSnapshot === true;

      // Normalize each raw item into ProviderStation candidate
      for (const rawItem of rawPayloadItems) {
        const normalized = provider.normalizeRawStation(rawItem);
        if (normalized) {
          candidateStations.push(normalized);
        } else {
          // Pre-validation error on raw structure
          rejected++;
          completeSnapshot=false;
          totalIssuesCount++;
          await db.insert(dataQualityIssues).values({issueType:"invalid_provider_record",severity:"error",description:"Provider record could not be normalized",details:{runId,provider:providerName,raw:rawItem}});
        }
      }
    } else {
      // Backwards-compatible path for standard ChargingDataProvider
      candidateStations = await provider.fetchStations({
        maxResults: options.maxResults ?? 10000,
        pageSize: options.pageSize ?? 10000,
      });
      rawPayloadItems = candidateStations;
      received = candidateStations.length;
    }

    // =========================================================================
    // STAGE 2: RAW ARCHIVE TO OBJECT STORAGE & POSTGRESQL OBJECT_METADATA
    // =========================================================================
    if (!options.skipRawArchive && rawPayloadItems.length > 0) {
      try {
        const archiveMeta = await archivalService.archiveRawPayload({
          provider: providerName,
          jobId: runId,
          source: "worker-ingestion",
          payload: JSON.stringify(rawPayloadItems),
          retentionDays: 180,
        });

        archivedObjectKey = archiveMeta.objectKey;

        // Persist object storage metadata into PostgreSQL
        await db
          .insert(objectMetadata)
          .values({
            objectKey: archiveMeta.objectKey,
            bucket: archiveMeta.bucket,
            contentType: archiveMeta.contentType,
            sizeBytes: archiveMeta.sizeBytes,
            checksumSha256: archiveMeta.checksumSha256,
            source: archiveMeta.source,
            provider: archiveMeta.provider,
            jobId: archiveMeta.jobId,
            retentionDays: archiveMeta.retentionDays,
            metadata: {
              recordCount: received,
              runId,
              retrievedAt: started.toISOString(),
              acquisition:acquisitionMetadata,
            },
          })
          .onConflictDoUpdate({
            target: objectMetadata.objectKey,
            set: {
              sizeBytes: archiveMeta.sizeBytes,
              checksumSha256: archiveMeta.checksumSha256,
              updatedAt: new Date(),
            },
          });
      } catch {
        const fallback=await new RawProviderArchivalService(new LocalObjectStorageClient()).archiveRawPayload({provider:providerName,jobId:runId,payload:JSON.stringify(rawPayloadItems)});
        archivedObjectKey=fallback.objectKey;
        await db.insert(objectMetadata).values({...fallback,metadata:{recordCount:received,runId,fallback:true,reason:"Object storage unavailable; payload retained in durable local staging"}}).onConflictDoUpdate({target:objectMetadata.objectKey,set:{updatedAt:new Date()}});
        console.warn("[WARN] Object storage unavailable; raw input archived to local staging.");
      }
    }

    // =========================================================================
    // PRELOAD REFERENCE CACHES (Eliminates N+1 Queries)
    // =========================================================================
    const [
      existingStates,
      existingCities,
      existingAliases,
      existingOperators,
      existingStations,
      existingMappings,
    ] = await Promise.all([
      db.select({ id: states.id, name: states.name, slug: states.slug, code: states.code }).from(states),
      db.select({ id: cities.id, name: cities.name, slug: cities.slug }).from(cities),
      db.select({ alias: cityAliases.alias, cityId: cityAliases.cityId }).from(cityAliases),
      db.select({ id: operators.id, slug: operators.slug }).from(operators),
      db
        .select({
          id: stations.id,
          ocmId: stations.ocmId,
          externalId: stations.externalId,
          slug: stations.slug,
          name: stations.name,
          address: stations.address,
          latitude: stations.latitude,
          longitude: stations.longitude,
          operatorId: stations.operatorId,
          researchCanonicalId: stations.researchCanonicalId,
        })
        .from(stations),
      db
        .select({
          stationId: stationProviderMappings.stationId,
          providerName: stationProviderMappings.providerName,
          providerStationId: stationProviderMappings.providerStationId,
          payloadHash: stationProviderMappings.payloadHash,
        })
        .from(stationProviderMappings)
        .catch(() => []), // Gracefully handle mocks where mappings table is not populated
    ]);

    const fingerprintMap = new Map(existingMappings.map(m=>[`${m.providerName}:${m.providerStationId}`,m.payloadHash]));
    const researchMap = new Map(existingStations.filter(st=>st.researchCanonicalId).map(st=>[st.researchCanonicalId!,{id:st.id,slug:st.slug}]));
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
    // Also include canonical aliases from CANONICAL_CITIES for robust mapping
    for (const cc of CANONICAL_CITIES) {
      const canonicalCityId = cityMap.get(cc.canonicalSlug) ?? cityMap.get(cc.canonicalName.toLowerCase());
      if (canonicalCityId) {
        for (const alias of cc.aliases) {
          if (!cityMap.has(alias.toLowerCase())) {
            cityMap.set(alias.toLowerCase(), canonicalCityId);
          }
        }
      }
    }

    const operatorMap = new Map<string, string>();
    const operatorIdToSlugMap = new Map<string, string>();
    for (const op of existingOperators) {
      operatorMap.set(op.slug, op.id);
      operatorIdToSlugMap.set(op.id, op.slug);
    }

    // Multi-tier Station Resolution Maps
    const stationIdMap = new Map<string, { id: string; slug: string }>();
    const stationOcmMap = new Map<number, { id: string; slug: string }>();
    const stationExternalIdMap = new Map<string, { id: string; slug: string }>();
    const proximityIndex: Array<{
      id: string;
      slug: string;
      name: string;
      address?:string|null;
      latitude: number;
      longitude: number;
      operatorSlug?: string;
    }> = [];

    for (const st of existingStations) {
      stationIdMap.set(st.id, { id: st.id, slug: st.slug });
      if (st.ocmId !== null && st.ocmId !== undefined) {
        stationOcmMap.set(st.ocmId, { id: st.id, slug: st.slug });
      }
      if (st.externalId) {
        stationExternalIdMap.set(st.externalId, { id: st.id, slug: st.slug });
      }
      proximityIndex.push({
        id: st.id,
        slug: st.slug,
        name: st.name,
        address:st.address,
        latitude: st.latitude,
        longitude: st.longitude,
        operatorSlug: st.operatorId ? operatorIdToSlugMap.get(st.operatorId) : undefined,
      });
    }

    // Provider Identity Mapping Map: `${providerName}:${providerStationId}` -> stationId
    const providerMappingMap = new Map<string, string>();
    for (const m of existingMappings) {
      providerMappingMap.set(`${m.providerName}:${m.providerStationId}`, m.stationId);
    }

    // Execution Core: Support optional transactional execution
    const processBatch = async (trx: typeof db) => {
      if (typeof trx.execute === "function") await trx.execute(sql`SELECT pg_advisory_xact_lock(117117)`);
      const seenProviderKeys=new Set<string>();
      for (const station of candidateStations) {
        try {
          const identities = station.provenance ?? [{provider:providerName,id:station.externalId,type:station.sourceType??"OTHER_LICENSED_PROVIDER"}];
          const providerStationKey = String(station.externalId ?? "");
          const key = `${identities[0]?.provider}:${identities[0]?.id}`;
          if(seenProviderKeys.has(key)) {duplicates++;rejected++;completeSnapshot=false;
            await trx.insert(dataQualityIssues).values({issueType:"duplicate_provider_record",severity:"warning",description:"Repeated identity in provider snapshot",details:{runId,key}});continue;}
          seenProviderKeys.add(key);

          // =====================================================================
          // STAGE 3: VALIDATION
          // =====================================================================
          const qualityIssues = auditStationQuality({
            latitude: station.latitude,
            longitude: station.longitude,
            pincode: station.pincode,
            city: station.city,
            state: station.state,
            name: station.name,
            status: station.status,
            operatorName: station.operatorName,
            connectors: station.connectors,
          });

          // Check for FATAL validation issues (Invalid Coordinates, Completely Missing ID)
          const fatalCoords = !validIndiaCoordinates(station.latitude, station.longitude);
          const fatalId = !providerStationKey;

          if (fatalCoords || fatalId) {
            rejected++;
            if(fatalId)completeSnapshot=false;
            else for(const identity of identities) {
              await trx.update(stationProviderMappings).set({lastSeenAt:started,ingestionRunId:syncLogId,missingFromSnapshot:false}).where(sql`${stationProviderMappings.providerName}=${identity.provider} AND ${stationProviderMappings.providerStationId}=${identity.id}`);
            }

            const fatalType = fatalCoords
              ? DATA_QUALITY_ISSUE_TYPES.INVALID_COORDINATES
              : "missing_provider_identifier";

            await trx.insert(dataQualityIssues).values({
              ocmId: station.ocmId,
              issueType: fatalType,
              severity: "error",
              description: fatalCoords
                ? `Fatal: Invalid geographic coordinates (${station.latitude}, ${station.longitude}).`
                : "Fatal: Upstream station has no unique provider identifier.",
              details: {
                latitude: station.latitude,
                longitude: station.longitude,
                externalId: providerName === "open-charge-map" ? station.externalId : `${providerName}:${station.externalId}`,
                researchCanonicalId: station.researchCanonicalId,
              },
            });
            totalIssuesCount++;

            // Record data quality event in MongoDB
            try {
              await eventStore.recordEvent("data_quality_events", {
                eventId: `dq-${runId}-${Math.random().toString(36).slice(2, 8)}`,
                eventType: EVENT_TYPES.DATA_QUALITY_ANOMALY_RECORDED,
                timestamp: new Date(),
                source: "worker-ingestion-validation",
                correlationId: runId,
                payload: {
                  stationOcmId: station.ocmId,
                  issueType: fatalType,
                  severity: "error",
                },
                version: 1,
              });
            } catch {}

            // Individual record failure isolated; continue to next record
            continue;
          }

          validated++;

          // =====================================================================
          // STAGE 4: NORMALIZATION & GEOGRAPHIC MAPPING
          // =====================================================================
          const pinCheck = validateIndianPincode(station.pincode);
          const cleanPincode = pinCheck.cleaned;
          if (cleanPincode) affectedPincodes.add(cleanPincode);

          let stateId: string | null = null;
          if (station.state) {
            const cleanState = station.state.trim().toLowerCase();
            const slugState = createSlug(station.state);
            stateId = stateMap.get(cleanState) ?? stateMap.get(slugState) ?? null;
            if (!stateId) {
              const canonicalState = resolveCanonicalState(station.state);
              if (canonicalState) {
                stateId = stateMap.get(canonicalState.slug) ?? stateMap.get(canonicalState.name.toLowerCase()) ?? null;
              }
            }
            if (slugState) affectedStateSlugs.add(slugState);
          }

          let cityId: string | null = null;
          let matchedCitySlug: string | null = null;

          if (station.city) {
            const cleanCity = station.city.trim().toLowerCase();
            const slugCity = createSlug(station.city);
            cityId = cityMap.get(cleanCity) ?? cityMap.get(slugCity) ?? null;
            if (cityId) matchedCitySlug = slugCity;
          }

          // Fallback 1: Resolve canonical city using full address, town, and state
          if (!cityId) {
            const resolvedCity = resolveCanonicalCity(
              station.city,
              station.address,
              station.state,
              { allowFallback: true },
            );
            if (resolvedCity) {
              cityId =
                cityMap.get(resolvedCity.canonicalSlug) ??
                cityMap.get(resolvedCity.canonicalName.toLowerCase()) ??
                null;
              if (cityId) matchedCitySlug = resolvedCity.canonicalSlug;
            }
          }

          // Fallback 2: Resolve by 6-digit Indian PIN code
          const pincodeLookup = CANONICAL_PINCODES as Record<string, { citySlug: string; stateSlug?: string }>;
          if (!cityId && cleanPincode && pincodeLookup[cleanPincode]) {
            const pinInfo = pincodeLookup[cleanPincode];
            cityId = cityMap.get(pinInfo.citySlug) ?? null;
            if (cityId) matchedCitySlug = pinInfo.citySlug;
            if (!stateId && pinInfo.stateSlug) {
              stateId = stateMap.get(pinInfo.stateSlug) ?? null;
            }
          }

          // Fallback 3: Resolve Delhi NCT prefix (110xxx)
          if (!cityId && cleanPincode?.startsWith("110")) {
            cityId = cityMap.get("delhi") ?? null;
            if (cityId) matchedCitySlug = "delhi";
            if (!stateId) stateId = stateMap.get("delhi") ?? null;
          }

          if(typeof trx.execute === "function") {
            const geo=await resolveGeography(trx,station);
            stateId=geo.stateId;cityId=geo.cityId;
          }

          if (matchedCitySlug) {
            affectedCitySlugs.add(matchedCitySlug);
          }

          // Operator Upsert
          let operatorId: string | null = null;
          let operatorSlug: string | undefined;
          if (station.operatorName) {
            operatorSlug = createSlug(station.operatorName);
            if (operatorMap.has(operatorSlug)) {
              operatorId = operatorMap.get(operatorSlug)!;
            } else {
              const [newOp] = await trx
                .insert(operators)
                .values({
                  name: station.operatorName,
                  slug: operatorSlug,
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

              if (newOp) {
                operatorId = newOp.id;
                operatorMap.set(operatorSlug, newOp.id);
              }
            }
          }

          // =====================================================================
          // STAGE 5: IDENTITY RESOLUTION (Multi-Tier Determinism)
          // =====================================================================
          let resolvedStationId: string | null = null;
          let resolvedStationSlug: string | null = null;

          const mappedIds=new Set(identities.map(m=>providerMappingMap.get(`${m.provider}:${m.id}`)).filter(Boolean));
          if(mappedIds.size>1) {
            rejected++;completeSnapshot=false;
            await trx.insert(dataQualityIssues).values({issueType:"conflicting_provider_identity",severity:"error",description:"Source identities point to different canonical stations",details:{runId,identities}});
            continue;
          }
          if(mappedIds.size===1) {
            resolvedStationId=Array.from(mappedIds)[0]!;
            resolvedStationSlug=stationIdMap.get(resolvedStationId)?.slug??null;
          }
          if(!resolvedStationId && station.researchCanonicalId && researchMap.has(station.researchCanonicalId)) {
            const match=researchMap.get(station.researchCanonicalId)!;
            resolvedStationId=match.id;resolvedStationSlug=match.slug;
          }
          // Tier 1: Upstream Provider Identity Mapping
          const mappingKey = `${providerName}:${providerStationKey}`;
          if (providerMappingMap.has(mappingKey)) {
            resolvedStationId = providerMappingMap.get(mappingKey)!;
            const existingMeta = stationIdMap.get(resolvedStationId);
            if (existingMeta) resolvedStationSlug = existingMeta.slug;
          }

          // Tier 2: OCM ID / External ID lookup
          if (!resolvedStationId && station.ocmId && stationOcmMap.has(station.ocmId)) {
            const match = stationOcmMap.get(station.ocmId)!;
            resolvedStationId = match.id;
            resolvedStationSlug = match.slug;
          }
          if (!resolvedStationId && providerName === "open-charge-map" && station.externalId && stationExternalIdMap.has(station.externalId)) {
            const match = stationExternalIdMap.get(station.externalId)!;
            resolvedStationId = match.id;
            resolvedStationSlug = match.slug;
          }

          // Tier 3: 25-Meter Spatial Proximity Resolution
          if (!resolvedStationId && typeof trx.execute === "function") {
            const spatial=await findSpatialIdentity(trx,station,operatorId);
            if(spatial.match) {resolvedStationId=String(spatial.match.id);resolvedStationSlug=String(spatial.match.slug);duplicates++;}
            else if(spatial.candidates.length) {
              await trx.insert(dataQualityIssues).values({issueType:"possible_duplicate",severity:"warning",description:"Nearby records require review; no automatic proximity-only merge",details:{runId,provider:providerName,providerStationKey,candidates:spatial.candidates.map(c=>c.id)}});
              totalIssuesCount++;
            }
          }
          if (!resolvedStationId && typeof trx.execute !== "function") {
            for (const candidate of proximityIndex) {
              const isDupe = isProximityDuplicate(
                {
                  latitude: station.latitude,
                  longitude: station.longitude,
                  name: station.name,
                  address:station.address,
                  operatorSlug,
                },
                {
                  latitude: candidate.latitude,
                  longitude: candidate.longitude,
                  name: candidate.name,
                  address:candidate.address,
                  operatorSlug: candidate.operatorSlug,
                },
                25, // 25-meter physical site threshold
              );

              if (isDupe) {
                resolvedStationId = candidate.id;
                resolvedStationSlug = candidate.slug;
                duplicates++;
                break;
              }
            }
          }

          // Stable Deterministic Slug
          const isExisting = resolvedStationId !== null;
          const finalSlug =
            resolvedStationSlug ??
            generateDeterministicStationSlug({
              name: station.name,
              cityOrDistrict: station.city ?? station.state,
              providerName,
              providerStationId: providerStationKey,
              latitude: station.latitude,
              longitude: station.longitude,
            });

          affectedStationSlugs.add(finalSlug);

          // =====================================================================
          // STAGE 6: POSTGRESQL/POSTGIS PERSISTENCE
          // =====================================================================
          let persistedStationId: string;

          const fingerprint=stationFingerprint(station);
          const isUnchanged=isExisting && identities.every(m=>fingerprintMap.get(`${m.provider}:${m.id}`)===fingerprint);
          if (isExisting && resolvedStationId) {
            // Update existing station
            await trx
              .update(stations)
              .set({
                name: station.name || "EV Charging Station",
                operatorId: operatorId ?? sql`${stations.operatorId}`,
                address: station.address ?? sql`${stations.address}`,
                cityId: cityId ?? sql`${stations.cityId}`,
                stateId: stateId ?? sql`${stations.stateId}`,
                district: station.district ?? sql`${stations.district}`,
                pincode: cleanPincode ?? sql`${stations.pincode}`,
                latitude: station.latitude,
                longitude: station.longitude,
                location: sql`ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)`,
                status: station.status,
                usageType: station.usageType ?? sql`${stations.usageType}`,
                dataLicense: station.dataLicense ?? sql`${stations.dataLicense}`,
                ocmUrl: station.ocmUrl ?? sql`${stations.ocmUrl}`,
                lastVerifiedAt: station.lastVerifiedAt ?? sql`${stations.lastVerifiedAt}`,
                lastSeenAt: station.sourceLastSeenAt ?? started,
                lastProviderUpdateAt: station.sourceUpdatedAt ?? sql`${stations.lastProviderUpdateAt}`,
                lastSyncedAt: new Date(),
                lifecycleState: sql`CASE WHEN ${stations.lifecycleState} = 'DECOMMISSIONED' THEN 'DECOMMISSIONED' ELSE 'ACTIVE' END`,
                updatedAt: isUnchanged ? sql`${stations.updatedAt}` : new Date(),
              })
              .where(sql`${stations.id} = ${resolvedStationId}`);

            persistedStationId = resolvedStationId;
            if(isUnchanged) unchanged++; else updated++;
          } else {
            // Insert new station
            const [newStation] = await trx
              .insert(stations)
              .values({
                ocmId: station.ocmId,
                externalId: providerName === "open-charge-map" ? station.externalId : `${providerName}:${station.externalId}`,
                researchCanonicalId:station.researchCanonicalId,
                name: station.name || "EV Charging Station",
                slug: finalSlug,
                operatorId,
                address: station.address,
                cityId,
                stateId,
                district: station.district || station.city,
                pincode: cleanPincode,
                latitude: station.latitude,
                longitude: station.longitude,
                location: sql`ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)`,
                status: station.status,
                verificationStatus: "unverified",
                usageType: station.usageType,
                dataProvider: station.dataProvider || providerName,
                dataLicense: station.dataLicense,
                ocmUrl: station.ocmUrl,
                lastVerifiedAt: station.lastVerifiedAt,
                lastSeenAt: station.sourceLastSeenAt ?? started,
                lastProviderUpdateAt: station.sourceUpdatedAt,
                lastSyncedAt: new Date(),
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: stations.slug,
                set: {
                  name: station.name || "EV Charging Station",
                  operatorId: operatorId ?? sql`${stations.operatorId}`,
                  status: station.status,
                  lastSyncedAt: new Date(),
                  updatedAt: new Date(),
                },
              })
              .returning({ id: stations.id });

            persistedStationId = newStation.id;
            inserted++;

            // Register in in-memory proximity index for subsequent stations in same run
            proximityIndex.push({
              id: newStation.id,
              slug: finalSlug,
              name: station.name || "",
              latitude: station.latitude,
              longitude: station.longitude,
              operatorSlug,
            });
            stationIdMap.set(newStation.id, { id: newStation.id, slug: finalSlug });
            if (station.ocmId) stationOcmMap.set(station.ocmId, { id: newStation.id, slug: finalSlug });
          }

          for(const issue of qualityIssues) {
            await trx.insert(dataQualityIssues).values({stationId:persistedStationId,ocmId:station.ocmId,issueType:issue.issueType,severity:issue.severity,description:issue.description,details:{...issue.details,runId,provider:station.dataProvider,providerStationKey}});
            totalIssuesCount++;
          }
          // Persist every provider identity; a failed mapping aborts the transaction.
          for(const identity of provenanceFor(station,providerName)) {
            const mappingValues={stationId:persistedStationId,providerName:identity.provider,providerStationId:identity.id,
              sourceType:identity.type,sourceUrl:identity.url,sourceUpdatedAt:identity.updatedAt,
              lastSeenAt:identity.lastSeenAt??started,lastSyncedAt:started,ingestionRunId:syncLogId,
              missingFromSnapshot:false,payloadHash:fingerprint,rawData:{station,evidence:identity.evidence}};
            await trx.insert(stationProviderMappings).values(mappingValues).onConflictDoUpdate({
              target:[stationProviderMappings.providerName,stationProviderMappings.providerStationId],set:{...mappingValues,updatedAt:started}});
            providerMappingMap.set(`${identity.provider}:${identity.id}`,persistedStationId);
            fingerprintMap.set(`${identity.provider}:${identity.id}`,fingerprint);
          }
          if(station.researchCanonicalId) researchMap.set(station.researchCanonicalId,{id:persistedStationId,slug:finalSlug});
          if(typeof trx.execute === "function") {
            await recordOperationalObservation(trx,station,persistedStationId,providerName,syncLogId,started);
            statusUpdates++;
          }

          // Upsert Connectors
          for(const conn of station.connectors) {
            if(conn.powerKw!==null && (!Number.isFinite(conn.powerKw)||conn.powerKw<0||conn.powerKw>=1000000)) {
              await trx.insert(dataQualityIssues).values({stationId:persistedStationId,issueType:"malformed_connector",severity:"warning",description:"Provider power exceeds the database numeric range; preserve evidence and leave power unknown",details:{runId,provider:providerName,powerKw:conn.powerKw,connectorId:conn.providerConnectorId??conn.ocmConnectionId}});
              conn.powerKw=null;totalIssuesCount++;
            }
          }
          for (const [connectorIndex,conn] of station.connectors.entries()) {
            if (conn.ocmConnectionId !== null && conn.ocmConnectionId !== undefined) {
              await trx
                .insert(connectors)
                .values({
                  stationId: persistedStationId,
                  ocmConnectionId: conn.ocmConnectionId,
                  providerName:conn.sourceProvider??providerName,
                  providerConnectorId:conn.providerConnectorId??String(conn.ocmConnectionId),
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
                    stationId: persistedStationId,
                    providerName:conn.sourceProvider??providerName,
                    providerConnectorId:conn.providerConnectorId??String(conn.ocmConnectionId),
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
              const connectorIdentity={providerName:conn.sourceProvider??providerName,providerConnectorId:conn.providerConnectorId??`${providerStationKey}:${connectorIndex}`};
              await trx.insert(connectors).values({
                ...connectorIdentity,
                stationId: persistedStationId,
                connectionType: conn.type,
                normalizedType: conn.normalizedType,
                level: conn.level,
                powerKw: conn.powerKw !== null ? String(conn.powerKw) : null,
                voltage: conn.voltage,
                amps: conn.amps,
                status: conn.status,
                quantity: conn.quantity,
              }).onConflictDoUpdate({target:[connectors.stationId,connectors.providerName,connectors.providerConnectorId],set:{connectionType:conn.type,normalizedType:conn.normalizedType,powerKw:conn.powerKw!==null?String(conn.powerKw):null,quantity:conn.quantity,updatedAt:started}});
            }
            totalConnectorsCount++;
          }
        } catch (recordError) {
          // If running inside transaction and the error is fatal, rethrow to trigger rollback
          if (options.useTransaction !== false) {
            throw recordError;
          }

          // Record-level error isolation: individual non-fatal record failures do not crash batch
          errors++;
          const errorMsg =
            recordError instanceof Error ? recordError.message : "Unexpected station record processing failure";

          try {
            await trx.insert(dataQualityIssues).values({
              ocmId: station.ocmId,
              issueType: "ingestion_record_error",
              severity: "error",
              description: `Record failure for ${station.ocmId ?? station.externalId}: ${errorMsg}`,
              details: { error: errorMsg },
            });
            totalIssuesCount++;
          } catch {}
        }
      }
      // Only an explicitly complete, error-free provider snapshot can mark missing identities.
      if(completeSnapshot && !errors && received>0 && typeof trx.execute === "function") {
        const result=await trx.execute(sql`UPDATE station_provider_mappings SET missing_from_snapshot=true
          WHERE provider_name=${providerName} AND ingestion_run_id IS DISTINCT FROM ${syncLogId} AND NOT missing_from_snapshot RETURNING station_id`);
        missing=result.rowCount??0;
        await trx.execute(sql`UPDATE stations s SET lifecycle_state='MISSING_FROM_SOURCE'
          WHERE lifecycle_state<>'DECOMMISSIONED' AND EXISTS(SELECT 1 FROM station_provider_mappings m WHERE m.station_id=s.id)
          AND NOT EXISTS(SELECT 1 FROM station_provider_mappings m WHERE m.station_id=s.id AND NOT m.missing_from_snapshot)`);
      }
      if(typeof trx.execute === "function") await trx.execute(sql`UPDATE cities c SET station_count=(SELECT count(*) FROM stations WHERE city_id=c.id)`);
      if(typeof trx.execute === "function") {
        const changes=await trx.execute(sql`SELECT count(*)::int n FROM
          (SELECT DISTINCT ON(station_id,source_provider,status_kind,connector_id) * FROM status_observations WHERE ingestion_run_id=${syncLogId}
            ORDER BY station_id,source_provider,status_kind,connector_id,received_at DESC,id) current
          LEFT JOIN LATERAL (SELECT status FROM status_observations old WHERE old.station_id=current.station_id
            AND old.source_provider=current.source_provider AND old.status_kind=current.status_kind
            AND old.connector_id IS NOT DISTINCT FROM current.connector_id AND old.ingestion_run_id IS DISTINCT FROM ${syncLogId}
            AND old.received_at<=current.received_at ORDER BY old.received_at DESC,old.id LIMIT 1) previous ON true
          WHERE current.status<>COALESCE(previous.status,'UNKNOWN')`);
        statusChanges=Number(changes.rows[0]?.n??0);
      }
    };

    // Execute atomically in production; in-memory test drivers may opt out.
    if (options.useTransaction !== false && typeof (db as { transaction?: unknown }).transaction === "function") {
      await (db as { transaction: (cb: (tx: typeof db) => Promise<void>) => Promise<void> }).transaction(
        async (tx) => {
          await processBatch(tx);
        },
      );
    } else {
      await processBatch(db);
    }

    // =========================================================================
    // STAGE 7: EVENTS (MongoDB Operational & Ingestion History)
    // =========================================================================
    const completed = new Date();
    const durationSeconds = Math.max(1, Math.round((completed.getTime() - started.getTime()) / 1000));

    try {
      await eventStore.recordEvent("ingestion_events", {
        eventId: `evt-comp-${runId}`,
        eventType: EVENT_TYPES.INGESTION_COMPLETED,
        timestamp: completed,
        source: "worker-ingestion",
        correlationId: runId,
        payload: {
          runId,
          provider: providerName,
          started: started.toISOString(),
          completed: completed.toISOString(),
          received,
          validated,
          rejected,
          inserted,
          updated,
          duplicates,
          errors,
          durationSeconds,
          archivedObjectKey,
        },
        version: 1,
      });
    } catch {
      // Event logging failure is isolated
    }

    // =========================================================================
    // STAGE 8: CACHE INVALIDATION (Redis)
    // =========================================================================
    try {
      cacheInvalidation=await cacheInvalidator.invalidate({
        stationSlugs: Array.from(affectedStationSlugs),
        citySlugs: Array.from(affectedCitySlugs),
        stateSlugs: Array.from(affectedStateSlugs),
        pincodes: Array.from(affectedPincodes),
        correlationId: runId,
      });
    } catch {
      // Cache invalidation errors are non-fatal
      cacheInvalidation={success:false,skipped:true,error:'Cache unavailable; PostgreSQL retained'};
    }

    // Update Final Sync Log in PostgreSQL
    await db
      .update(syncLogs)
      .set({
        completedAt: completed,
        recordsFetched: received,
        recordsCreated: inserted,
        recordsUpdated: updated,
        recordsSkipped: rejected,
        recordsFailed: errors,
        recordsUnchanged: unchanged,
        fullSnapshot:completeSnapshot,
        recordsMissing: missing,
        statusUpdates,
        errorCount: errors,
        status: errors > 0 && inserted === 0 && updated === 0 ? "failed" : "completed",
        details: {
          runId,
          durationSeconds,
          operatorsCount: operatorMap.size,
          connectorsCount: totalConnectorsCount,
          dataQualityIssuesCount: totalIssuesCount,
          duplicates,
          archivedObjectKey,
          cacheInvalidation,
          statusChanges,
        },
      })
      .where(sql`${syncLogs.id} = ${syncLogId}`);

    return {
      runId,
      provider: providerName,
      started,
      completed,
      received,
      validated,
      rejected,
      inserted,
      updated,
      duplicates,
      errors,
      unchanged,
      missing,
      statusUpdates,
      statusChanges,
      // Backwards compatibility
      syncLogId,
      source: providerName,
      country: "India",
      fetched: received,
      created: inserted,
      skipped: rejected,
      failed: errors,
      operatorsCount: operatorMap.size,
      stationsCount: stationIdMap.size,
      connectorsCount: totalConnectorsCount,
      dataQualityIssuesCount: totalIssuesCount,
      durationSeconds,
      archivedObjectKey,
    };
  } catch (fatalBatchError) {
    const completed = new Date();
    const durationSeconds = Math.max(1, Math.round((completed.getTime() - started.getTime()) / 1000));
    const fatalMessage =
      fatalBatchError instanceof Error ? fatalBatchError.message : "Fatal ingestion batch error";

    // Record Ingestion Failed Event
    try {
      await eventStore.recordEvent("ingestion_events", {
        eventId: `evt-fail-${runId}`,
        eventType: EVENT_TYPES.INGESTION_FAILED,
        timestamp: completed,
        source: "worker-ingestion",
        correlationId: runId,
        payload: {
          runId,
          provider: providerName,
          started: started.toISOString(),
          completed: completed.toISOString(),
          error: fatalMessage,
          received,
          validated,
          rejected,
          inserted,
          updated,
          duplicates,
          errors: errors + 1,
          durationSeconds,
        },
        version: 1,
      });
    } catch {}

    // Update Sync Log Status to Failed
    await db
      .update(syncLogs)
      .set({
        completedAt: completed,
        recordsFetched: received,
        recordsCreated: inserted,
        recordsUpdated: updated,
        recordsSkipped: rejected,
        recordsFailed: errors + 1,
        errorCount: errors + 1,
        status: "failed",
        details: {
          runId,
          error: fatalMessage,
          durationSeconds,
        },
      })
      .where(sql`${syncLogs.id} = ${syncLogId}`);

    throw fatalBatchError;
  }
}
