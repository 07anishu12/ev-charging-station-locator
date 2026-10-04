import { desc, eq, sql } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { resolveCanonicalCity } from "@fastcharger/shared";
import { getDatabase } from "../infrastructure/database";
import type { CityModel, PaginatedResult } from "../domain/models";

const { cities, states, cityAliases } = schema;

export interface ICityRepository {
  findAll(page: number, pageSize: number): Promise<PaginatedResult<CityModel>>;
  findBySlug(slug: string): Promise<CityModel | null>;
}

export class DrizzleCityRepository implements ICityRepository {
  async findAll(page: number, pageSize: number): Promise<PaginatedResult<CityModel>> {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(cities);
    const total = Number(countResult[0]?.count || 0);

    const rows = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        latitude: cities.latitude,
        longitude: cities.longitude,
        stationCount: cities.stationCount,
        stateId: states.id,
        stateName: states.name,
      })
      .from(cities)
      .leftJoin(states, eq(cities.stateId, states.id))
      .orderBy(desc(cities.stationCount), cities.name)
      .limit(pageSize)
      .offset(offset);

    const items: CityModel[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      latitude: r.latitude,
      longitude: r.longitude,
      stationCount: r.stationCount,
      stateId: r.stateId ?? undefined,
      stateName: r.stateName ?? undefined,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async findBySlug(slug: string): Promise<CityModel | null> {
    const db = getDatabase();
    const cleanSlug = slug.toLowerCase().trim();

    // 1. Direct match by slug
    const rows = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        latitude: cities.latitude,
        longitude: cities.longitude,
        stationCount: cities.stationCount,
        stateId: states.id,
        stateName: states.name,
      })
      .from(cities)
      .leftJoin(states, eq(cities.stateId, states.id))
      .where(eq(cities.slug, cleanSlug))
      .limit(1);

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        latitude: r.latitude,
        longitude: r.longitude,
        stationCount: r.stationCount,
        stateId: r.stateId ?? undefined,
        stateName: r.stateName ?? undefined,
      };
    }

    // 2. Check city_aliases table
    const aliasRows = await db
      .select({ cityId: cityAliases.cityId })
      .from(cityAliases)
      .where(eq(cityAliases.alias, cleanSlug))
      .limit(1);

    if (aliasRows.length > 0) {
      const canonicalRows = await db
        .select({
          id: cities.id,
          name: cities.name,
          slug: cities.slug,
          latitude: cities.latitude,
          longitude: cities.longitude,
          stationCount: cities.stationCount,
          stateId: states.id,
          stateName: states.name,
        })
        .from(cities)
        .leftJoin(states, eq(cities.stateId, states.id))
        .where(eq(cities.id, aliasRows[0].cityId))
        .limit(1);

      if (canonicalRows.length > 0) {
        const r = canonicalRows[0];
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          latitude: r.latitude,
          longitude: r.longitude,
          stationCount: r.stationCount,
          stateId: r.stateId ?? undefined,
          stateName: r.stateName ?? undefined,
        };
      }
    }

    // 3. Fallback to canonical resolution helper
    const resolved = resolveCanonicalCity(cleanSlug);
    if (resolved && resolved.canonicalSlug !== cleanSlug) {
      return this.findBySlug(resolved.canonicalSlug);
    }

    return null;
  }
}
