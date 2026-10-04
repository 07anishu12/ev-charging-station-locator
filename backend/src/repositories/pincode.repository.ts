import { eq, sql } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { getDatabase } from "../infrastructure/database";
import type { PincodeModel } from "../domain/models";

const { pincodes, cities, states } = schema;

export interface IPincodeRepository {
  findByCode(pincode: string): Promise<PincodeModel | null>;
  findNearbyPincodes(lat: number, lng: number, radiusKm: number, limit?: number): Promise<Array<{ pincode: string; distanceKm: number }>>;
}

export class DrizzlePincodeRepository implements IPincodeRepository {
  async findByCode(pincode: string): Promise<PincodeModel | null> {
    const db = getDatabase();
    const rows = await db
      .select({
        pincode: pincodes.pincode,
        district: pincodes.district,
        cityId: pincodes.cityId,
        cityName: cities.name,
        stateId: pincodes.stateId,
        stateName: states.name,
        latitude: pincodes.latitude,
        longitude: pincodes.longitude,
      })
      .from(pincodes)
      .leftJoin(cities, eq(pincodes.cityId, cities.id))
      .leftJoin(states, eq(pincodes.stateId, states.id))
      .where(eq(pincodes.pincode, pincode))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const r = rows[0];
    return {
      pincode: r.pincode,
      district: r.district,
      cityId: r.cityId,
      cityName: r.cityName,
      stateId: r.stateId,
      stateName: r.stateName,
      latitude: r.latitude,
      longitude: r.longitude,
    };
  }

  async findNearbyPincodes(
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 10,
  ): Promise<Array<{ pincode: string; distanceKm: number }>> {
    const db = getDatabase();
    const pointSql = sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
    const distanceKmSql = sql<number>`ROUND((ST_Distance(ST_SetSRID(ST_MakePoint(${pincodes.longitude}, ${pincodes.latitude}), 4326)::geography, ${pointSql}) / 1000.0)::numeric, 1)`;

    const rows = await db
      .select({
        pincode: pincodes.pincode,
        distanceKm: distanceKmSql,
      })
      .from(pincodes)
      .where(
        sql`${pincodes.latitude} IS NOT NULL AND ${pincodes.longitude} IS NOT NULL AND ST_DWithin(ST_SetSRID(ST_MakePoint(${pincodes.longitude}, ${pincodes.latitude}), 4326)::geography, ${pointSql}, ${radiusKm * 1000})`,
      )
      .orderBy(sql`${distanceKmSql} ASC`)
      .limit(limit);

    return rows.map((r) => ({
      pincode: r.pincode,
      distanceKm: Number(r.distanceKm),
    }));
  }
}
