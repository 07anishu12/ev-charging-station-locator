import { desc, eq, sql } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { getDatabase } from "../infrastructure/database";
import type { CityModel, PaginatedResult } from "../domain/models";

const { cities, states } = schema;

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
      .where(eq(cities.slug, slug.toLowerCase()))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

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
}
