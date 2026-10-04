import { desc, eq, sql } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { resolveCanonicalCity } from "@fastcharger/shared";
import { getDatabase } from "../infrastructure/database";
import type { CityModel, CityStatisticsModel, PaginatedResult } from "../domain/models";

const { cities, states, cityAliases, stations, connectors } = schema;

export interface ICityRepository {
  findAll(page: number, pageSize: number): Promise<PaginatedResult<CityModel>>;
  findBySlug(slug: string): Promise<CityModel | null>;
  getStatistics(slug: string): Promise<CityStatisticsModel | null>;
}

export class DrizzleCityRepository implements ICityRepository {
  private getCitySelectFields() {
    return {
      id: cities.id,
      name: cities.name,
      slug: cities.slug,
      latitude: cities.latitude,
      longitude: cities.longitude,
      stationCount: sql<number>`cast(count(distinct ${stations.id}) as integer)`,
      networkCount: sql<number>`cast(count(distinct ${stations.operatorId}) as integer)`,
      fastChargerCount: sql<number>`cast(count(distinct case when ${connectors.powerKw} >= 50 then ${stations.id} end) as integer)`,
      stateId: states.id,
      stateName: states.name,
      stateSlug: states.slug,
    };
  }

  async findAll(page: number, pageSize: number): Promise<PaginatedResult<CityModel>> {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(cities);
    const total = Number(countResult[0]?.count || 0);

    const rows = await db
      .select(this.getCitySelectFields())
      .from(cities)
      .leftJoin(states, eq(cities.stateId, states.id))
      .leftJoin(stations, eq(stations.cityId, cities.id))
      .leftJoin(connectors, eq(connectors.stationId, stations.id))
      .groupBy(cities.id, states.id)
      .orderBy(desc(sql`count(distinct ${stations.id})`), cities.name)
      .limit(pageSize)
      .offset(offset);

    const items: CityModel[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      latitude: r.latitude,
      longitude: r.longitude,
      stationCount: Number(r.stationCount || 0),
      networkCount: Number(r.networkCount || 0),
      fastChargerCount: Number(r.fastChargerCount || 0),
      stateId: r.stateId ?? undefined,
      stateName: r.stateName ?? undefined,
      stateSlug: r.stateSlug ?? undefined,
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
      .select(this.getCitySelectFields())
      .from(cities)
      .leftJoin(states, eq(cities.stateId, states.id))
      .leftJoin(stations, eq(stations.cityId, cities.id))
      .leftJoin(connectors, eq(connectors.stationId, stations.id))
      .where(eq(cities.slug, cleanSlug))
      .groupBy(cities.id, states.id)
      .limit(1);

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        latitude: r.latitude,
        longitude: r.longitude,
        stationCount: Number(r.stationCount || 0),
        networkCount: Number(r.networkCount || 0),
        fastChargerCount: Number(r.fastChargerCount || 0),
        stateId: r.stateId ?? undefined,
        stateName: r.stateName ?? undefined,
        stateSlug: r.stateSlug ?? undefined,
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
        .select(this.getCitySelectFields())
        .from(cities)
        .leftJoin(states, eq(cities.stateId, states.id))
        .leftJoin(stations, eq(stations.cityId, cities.id))
        .leftJoin(connectors, eq(connectors.stationId, stations.id))
        .where(eq(cities.id, aliasRows[0].cityId))
        .groupBy(cities.id, states.id)
        .limit(1);

      if (canonicalRows.length > 0) {
        const r = canonicalRows[0];
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          latitude: r.latitude,
          longitude: r.longitude,
          stationCount: Number(r.stationCount || 0),
          networkCount: Number(r.networkCount || 0),
          fastChargerCount: Number(r.fastChargerCount || 0),
          stateId: r.stateId ?? undefined,
          stateName: r.stateName ?? undefined,
          stateSlug: r.stateSlug ?? undefined,
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

  async getStatistics(slug: string): Promise<CityStatisticsModel | null> {
    const city = await this.findBySlug(slug);
    if (!city) {
      return null;
    }

    const db = getDatabase();
    const connResult = await db
      .select({ count: sql<number>`cast(count(distinct ${connectors.id}) as integer)` })
      .from(connectors)
      .innerJoin(stations, eq(connectors.stationId, stations.id))
      .where(eq(stations.cityId, city.id));

    return {
      citySlug: city.slug,
      cityName: city.name,
      stateSlug: city.stateSlug,
      stateName: city.stateName,
      stationCount: city.stationCount,
      networkCount: city.networkCount ?? 0,
      fastChargerCount: city.fastChargerCount ?? 0,
      totalConnectors: Number(connResult[0]?.count || 0),
    };
  }
}
