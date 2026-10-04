import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { getDatabase } from "../infrastructure/database";
import type {
  StationModel,
  NearbyStationModel,
  PaginatedResult,
  ConnectorModel,
} from "../domain/models";

const { stations, connectors, operators, cities, states } = schema;

export interface StationListFilter {
  page: number;
  pageSize: number;
  city?: string;
  state?: string;
  operator?: string;
  status?: string;
  connectorType?: string;
  minPowerKw?: number;
  search?: string;
}

export interface StationNearbyFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
  connectorType?: string;
  minPowerKw?: number;
  page: number;
  pageSize: number;
}

export interface IStationRepository {
  findByIdOrSlug(idOrSlug: string): Promise<StationModel | null>;
  findList(filter: StationListFilter): Promise<PaginatedResult<StationModel>>;
  findNearby(filter: StationNearbyFilter): Promise<PaginatedResult<NearbyStationModel>>;
}

interface StationRow {
  id: string;
  ocmId?: number | null;
  slug: string;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  usageType?: string | null;
  dataProvider: string;
  dataLicense?: string | null;
  ocmUrl?: string | null;
  lastVerifiedAt?: Date | null;
  updatedAt?: Date | null;
  district?: string | null;
  pincode?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  operatorSlug?: string | null;
  operatorWebsite?: string | null;
  cityName?: string | null;
  citySlug?: string | null;
  stateName?: string | null;
  stateSlug?: string | null;
  stateCode?: string | null;
}

export class PostgisStationRepository implements IStationRepository {
  async findByIdOrSlug(idOrSlug: string): Promise<StationModel | null> {
    const db = getDatabase();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const isOcmId = /^\d+$/.test(idOrSlug);

    const conditions = [eq(stations.slug, idOrSlug)];
    if (isUuid) {
      conditions.push(eq(stations.id, idOrSlug));
    }
    if (isOcmId) {
      conditions.push(eq(stations.ocmId, parseInt(idOrSlug, 10)));
    }

    const stationRows = await db
      .select({
        id: stations.id,
        ocmId: stations.ocmId,
        slug: stations.slug,
        name: stations.name,
        address: stations.address,
        latitude: stations.latitude,
        longitude: stations.longitude,
        status: stations.status,
        usageType: stations.usageType,
        dataProvider: stations.dataProvider,
        dataLicense: stations.dataLicense,
        ocmUrl: stations.ocmUrl,
        lastVerifiedAt: stations.lastVerifiedAt,
        updatedAt: stations.updatedAt,
        district: stations.district,
        pincode: stations.pincode,
        operatorId: operators.id,
        operatorName: operators.name,
        operatorSlug: operators.slug,
        operatorWebsite: operators.website,
        cityName: cities.name,
        citySlug: cities.slug,
        stateName: states.name,
        stateSlug: states.slug,
        stateCode: states.code,
      })
      .from(stations)
      .leftJoin(operators, eq(stations.operatorId, operators.id))
      .leftJoin(cities, eq(stations.cityId, cities.id))
      .leftJoin(states, eq(stations.stateId, states.id))
      .where(or(...conditions))
      .limit(1);

    if (stationRows.length === 0) {
      return null;
    }

    const st = stationRows[0];
    const connectorRows = await db
      .select()
      .from(connectors)
      .where(eq(connectors.stationId, st.id));

    return this.mapToStationModel(st, connectorRows);
  }

  async findList(filter: StationListFilter): Promise<PaginatedResult<StationModel>> {
    const db = getDatabase();
    const { page, pageSize } = filter;
    const offset = (page - 1) * pageSize;

    const whereConditions = [];

    if (filter.city) {
      whereConditions.push(
        or(eq(cities.slug, filter.city.toLowerCase()), ilike(cities.name, filter.city)),
      );
    }
    if (filter.state) {
      whereConditions.push(
        or(eq(states.slug, filter.state.toLowerCase()), ilike(states.name, filter.state)),
      );
    }
    if (filter.operator) {
      whereConditions.push(
        or(eq(operators.slug, filter.operator.toLowerCase()), ilike(operators.name, filter.operator)),
      );
    }
    if (filter.status) {
      whereConditions.push(ilike(stations.status, filter.status));
    }
    if (filter.search) {
      const searchPattern = `%${filter.search}%`;
      whereConditions.push(
        or(
          ilike(stations.name, searchPattern),
          ilike(stations.address, searchPattern),
          eq(stations.pincode, filter.search),
        ),
      );
    }

    const baseWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Total count query
    const countResult = await db
      .select({ count: sql<number>`count(distinct ${stations.id})` })
      .from(stations)
      .leftJoin(operators, eq(stations.operatorId, operators.id))
      .leftJoin(cities, eq(stations.cityId, cities.id))
      .leftJoin(states, eq(stations.stateId, states.id))
      .where(baseWhere);

    const total = Number(countResult[0]?.count || 0);

    // Paged items query
    const stationRows = await db
      .select({
        id: stations.id,
        ocmId: stations.ocmId,
        slug: stations.slug,
        name: stations.name,
        address: stations.address,
        latitude: stations.latitude,
        longitude: stations.longitude,
        status: stations.status,
        usageType: stations.usageType,
        dataProvider: stations.dataProvider,
        dataLicense: stations.dataLicense,
        ocmUrl: stations.ocmUrl,
        lastVerifiedAt: stations.lastVerifiedAt,
        updatedAt: stations.updatedAt,
        district: stations.district,
        pincode: stations.pincode,
        operatorId: operators.id,
        operatorName: operators.name,
        operatorSlug: operators.slug,
        operatorWebsite: operators.website,
        cityName: cities.name,
        citySlug: cities.slug,
        stateName: states.name,
        stateSlug: states.slug,
        stateCode: states.code,
      })
      .from(stations)
      .leftJoin(operators, eq(stations.operatorId, operators.id))
      .leftJoin(cities, eq(stations.cityId, cities.id))
      .leftJoin(states, eq(stations.stateId, states.id))
      .where(baseWhere)
      .orderBy(desc(stations.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Fetch connectors for these stations
    const stationIds = stationRows.map((s) => s.id);
    let allConnectors: Array<typeof connectors.$inferSelect> = [];
    if (stationIds.length > 0) {
      allConnectors = await db
        .select()
        .from(connectors)
        .where(sql`${connectors.stationId} IN ${stationIds}`);
    }

    const items = stationRows.map((st) => {
      const stationConns = allConnectors.filter((c) => c.stationId === st.id);
      return this.mapToStationModel(st, stationConns);
    });

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

  async findNearby(filter: StationNearbyFilter): Promise<PaginatedResult<NearbyStationModel>> {
    const db = getDatabase();
    const { latitude, longitude, radiusKm, page, pageSize } = filter;
    const offset = (page - 1) * pageSize;
    const radiusMeters = radiusKm * 1000;

    // PostGIS geographic calculation
    // ST_MakePoint takes (longitude, latitude)
    const targetPoint = sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    const distanceKmExpr = sql<number>`ROUND((ST_Distance(${stations.location}, ${targetPoint}) / 1000.0)::numeric, 2)`;
    const withinRadiusExpr = sql`ST_DWithin(${stations.location}, ${targetPoint}, ${radiusMeters})`;

    const whereConditions = [withinRadiusExpr];

    // Optional connector/power filters
    if (filter.minPowerKw || filter.connectorType) {
      const subqueryConditions = [eq(connectors.stationId, stations.id)];
      if (filter.minPowerKw) {
        subqueryConditions.push(gte(connectors.powerKw, String(filter.minPowerKw)));
      }
      if (filter.connectorType) {
        subqueryConditions.push(eq(connectors.normalizedType, filter.connectorType.toLowerCase()));
      }
      whereConditions.push(
        sql`EXISTS (SELECT 1 FROM ${connectors} WHERE ${and(...subqueryConditions)})`,
      );
    }

    const combinedWhere = and(...whereConditions);

    // Total count query
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(stations)
      .where(combinedWhere);

    const total = Number(countResult[0]?.count || 0);

    // Spatial nearby query ordered strictly by PostGIS distance
    const stationRows = await db
      .select({
        id: stations.id,
        ocmId: stations.ocmId,
        slug: stations.slug,
        name: stations.name,
        address: stations.address,
        latitude: stations.latitude,
        longitude: stations.longitude,
        status: stations.status,
        usageType: stations.usageType,
        dataProvider: stations.dataProvider,
        dataLicense: stations.dataLicense,
        ocmUrl: stations.ocmUrl,
        lastVerifiedAt: stations.lastVerifiedAt,
        updatedAt: stations.updatedAt,
        district: stations.district,
        pincode: stations.pincode,
        distanceKm: distanceKmExpr,
        operatorId: operators.id,
        operatorName: operators.name,
        operatorSlug: operators.slug,
        operatorWebsite: operators.website,
        cityName: cities.name,
        citySlug: cities.slug,
        stateName: states.name,
        stateSlug: states.slug,
        stateCode: states.code,
      })
      .from(stations)
      .leftJoin(operators, eq(stations.operatorId, operators.id))
      .leftJoin(cities, eq(stations.cityId, cities.id))
      .leftJoin(states, eq(stations.stateId, states.id))
      .where(combinedWhere)
      .orderBy(sql`${distanceKmExpr} ASC`)
      .limit(pageSize)
      .offset(offset);

    const stationIds = stationRows.map((s) => s.id);
    let allConnectors: Array<typeof connectors.$inferSelect> = [];
    if (stationIds.length > 0) {
      allConnectors = await db
        .select()
        .from(connectors)
        .where(sql`${connectors.stationId} IN ${stationIds}`);
    }

    const items: NearbyStationModel[] = stationRows.map((st) => {
      const stationConns = allConnectors.filter((c) => c.stationId === st.id);
      const baseStation = this.mapToStationModel(st, stationConns);
      return {
        ...baseStation,
        distanceKm: Number(st.distanceKm),
      };
    });

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

  private mapToStationModel(
    st: StationRow,
    connectorRows: Array<typeof connectors.$inferSelect>,
  ): StationModel {
    const fastestKw = connectorRows.reduce(
      (max, c) => Math.max(max, Number(c.powerKw || 0)),
      0,
    );

    const mappedConnectors: ConnectorModel[] = connectorRows.map((c) => ({
      id: c.id,
      type: c.connectionType,
      normalizedType: c.normalizedType,
      powerKw: c.powerKw ? Number(c.powerKw) : 50,
      voltage: c.voltage ?? undefined,
      amps: c.amps ?? undefined,
      status: (c.status as "available" | "busy" | "unavailable" | "unknown") || "available",
      quantity: c.quantity ?? 1,
    }));

    return {
      id: st.id,
      ocmId: st.ocmId ?? null,
      slug: st.slug,
      name: st.name,
      operator: {
        id: st.operatorId ?? "unknown",
        name: st.operatorName ?? "Independent",
        slug: st.operatorSlug ?? "independent",
        website: st.operatorWebsite ?? null,
      },
      address: st.address ?? "",
      city: {
        name: st.cityName ?? "Unknown",
        slug: st.citySlug ?? "unknown",
      },
      state: {
        name: st.stateName ?? "India",
        slug: st.stateSlug ?? "india",
        code: (st.stateCode ?? st.stateSlug ?? "IN").toUpperCase().slice(0, 2),
      },
      district: st.district ?? undefined,
      pincode: st.pincode ?? "",
      latitude: Number(st.latitude),
      longitude: Number(st.longitude),
      status: (st.status === "Operational" || st.status === "Not Operational"
        ? st.status
        : "Operational") as "Operational" | "Not Operational" | "Unknown",
      operationalStatus: String(st.status).toLowerCase().includes("operational")
        ? "available"
        : "unknown",
      usageType: st.usageType ?? "Public",
      dataProvider: st.dataProvider || "Open Charge Map",
      dataLicense: st.dataLicense ?? "CC BY 4.0",
      ocmUrl: st.ocmUrl ?? (st.ocmId ? `https://openchargemap.org/site/poi/details/${st.ocmId}` : null),
      lastUpdated: st.updatedAt ? new Date(st.updatedAt).toISOString() : "Verified",
      fastestPowerKw: fastestKw || 50,
      connectors: mappedConnectors,
    };
  }
}
