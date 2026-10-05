/**
 * FastCharger Cache Invalidation Service
 *
 * RULES:
 * - Redis is NOT authoritative; it serves purely as a volatile cache / acceleration layer.
 * - Ingestion must invalidate affected Redis keys after successful PostgreSQL mutations.
 * - Failure Isolation: Redis unavailability must NEVER break the core ingestion pipeline.
 */

import { createClient } from "redis";
import { EVENT_TYPES, getEventStore } from "@fastcharger/database";

export interface CacheInvalidationOptions {
  stationSlugs?: string[];
  citySlugs?: string[];
  stateSlugs?: string[];
  pincodes?: string[];
  tags?: string[];
  correlationId?: string;
}

export interface CacheInvalidationResult {
  success: boolean;
  invalidatedKeys: string[];
  skipped?: boolean;
  error?: string;
}

export interface CacheInvalidator {
  invalidate(options: CacheInvalidationOptions): Promise<CacheInvalidationResult>;
}

export class InMemoryCacheInvalidator implements CacheInvalidator {
  public invalidatedKeysHistory: string[][] = [];

  async invalidate(options: CacheInvalidationOptions): Promise<CacheInvalidationResult> {
    const keys = buildInvalidationKeys(options);
    this.invalidatedKeysHistory.push(keys);

    // Record operational event (failure-isolated)
    try {
      await getEventStore().recordEvent("operational_events", {
        eventId: `cache-inval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventType: EVENT_TYPES.CACHE_INVALIDATION,
        timestamp: new Date(),
        source: "worker-cache-invalidator",
        correlationId: options.correlationId || `job-${Date.now()}`,
        payload: {
          keysCount: keys.length,
          sampleKeys: keys.slice(0, 10),
          success: true,
        },
        version: 1,
      });
    } catch {
      // Event failure is non-fatal
    }

    return {
      success: true,
      invalidatedKeys: keys,
    };
  }
}

export class RedisCacheInvalidator implements CacheInvalidator {
  private readonly redisClient?: {
    del: (...keys: string[]) => Promise<number>;
  } | null;

  constructor(redisClient?: { del: (...keys: string[]) => Promise<number> } | null) {
    this.redisClient = redisClient ?? null;
  }

  async invalidate(options: CacheInvalidationOptions): Promise<CacheInvalidationResult> {
    const keys = buildInvalidationKeys(options);

    if (keys.length === 0) {
      return { success: true, invalidatedKeys: [] };
    }

    try {
      if (this.redisClient) {
        await this.redisClient.del(...keys);
      } else if (process.env.REDIS_URL) {
        const client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:2000,reconnectStrategy:false}});
        client.on("error",()=>{});
        try {
          await client.connect();
          for(const pattern of keys) {
            if(pattern.includes("*")) {for await(const matches of client.scanIterator({MATCH:pattern,COUNT:200}))if(matches.length)await client.del(matches);}
            else await client.del(pattern);
          }
        } finally {if(client.isOpen)client.destroy();}
      } else {
        return {success:true,skipped:true,invalidatedKeys:[]};
      }

      // Record operational event in MongoEventStore (failure-isolated)
      try {
        await getEventStore().recordEvent("operational_events", {
          eventId: `cache-inval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          eventType: EVENT_TYPES.CACHE_INVALIDATION,
          timestamp: new Date(),
          source: "worker-cache-invalidator",
          correlationId: options.correlationId || `job-${Date.now()}`,
          payload: {
            keysCount: keys.length,
            sampleKeys: keys.slice(0, 10),
            success: true,
          },
          version: 1,
        });
      } catch {
        // Ingestion pipeline continues even if event logging errors
      }

      return {
        success: true,
        invalidatedKeys: keys,
      };
    } catch {
      const errorMsg = "Redis cache unavailable; PostgreSQL remains authoritative";
      console.warn(`[WARN] Cache invalidation skipped or encountered error: ${errorMsg}`);

      return {
        success: false,
        invalidatedKeys: [],
        skipped: true,
        error: errorMsg,
      };
    }
  }
}

export function buildInvalidationKeys(options: CacheInvalidationOptions): string[] {
  const keys = new Set<string>();

  // Global station lists and count caches
  keys.add("stations:all");
  keys.add("stations:summary");
  keys.add("stations:nearby:*");
  keys.add("stations:*");
  keys.add("cities:*");
  keys.add("states:*");
  keys.add("map:*");
  keys.add("nearby:*");
  keys.add("search:*");

  for (const slug of options.stationSlugs || []) {
    if (slug) keys.add(`station:${slug}`);
  }

  for (const city of options.citySlugs || []) {
    if (city) {
      keys.add(`city:${city}`);
      keys.add(`city:${city}:stations`);
    }
  }

  for (const state of options.stateSlugs || []) {
    if (state) {
      keys.add(`state:${state}`);
      keys.add(`state:${state}:stations`);
    }
  }

  for (const pin of options.pincodes || []) {
    if (pin) {
      keys.add(`pincode:${pin}`);
    }
  }

  for (const tag of options.tags || []) {
    if (tag) keys.add(`tag:${tag}`);
  }

  return Array.from(keys);
}

let globalCacheInvalidator: CacheInvalidator | null = null;

export function getCacheInvalidator(): CacheInvalidator {
  if (!globalCacheInvalidator) {
    globalCacheInvalidator = new RedisCacheInvalidator();
  }
  return globalCacheInvalidator;
}

export function setCacheInvalidator(invalidator: CacheInvalidator | null): void {
  globalCacheInvalidator = invalidator;
}
