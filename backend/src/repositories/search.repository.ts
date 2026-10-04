import { ilike, or } from "drizzle-orm";
import { schema } from "@fastcharger/database";
import { getDatabase } from "../infrastructure/database";

const { stations, cities, operators, pincodes } = schema;

export interface SearchEntity {
  id: string;
  title: string;
  subtitle: string;
  type: "station" | "city" | "operator" | "pincode";
  url: string;
  metadata?: Record<string, unknown>;
}

export interface ISearchRepository {
  searchEntities(query: string, limit?: number): Promise<SearchEntity[]>;
}

export class DrizzleSearchRepository implements ISearchRepository {
  async searchEntities(query: string, limit = 20): Promise<SearchEntity[]> {
    const db = getDatabase();
    const pattern = `%${query.trim()}%`;
    const results: SearchEntity[] = [];

    // 1. Search Cities
    const cityRows = await db
      .select({
        id: cities.id,
        name: cities.name,
        slug: cities.slug,
        stationCount: cities.stationCount,
      })
      .from(cities)
      .where(or(ilike(cities.name, pattern), ilike(cities.slug, pattern)))
      .limit(limit);

    for (const c of cityRows) {
      results.push({
        id: `city-${c.slug}`,
        title: c.name,
        subtitle: `City • ${c.stationCount} stations`,
        type: "city",
        url: `/cities/${c.slug}`,
        metadata: { slug: c.slug, stationCount: c.stationCount },
      });
    }

    // 2. Search Operators
    const operatorRows = await db
      .select({
        id: operators.id,
        name: operators.name,
        slug: operators.slug,
      })
      .from(operators)
      .where(or(ilike(operators.name, pattern), ilike(operators.slug, pattern)))
      .limit(limit);

    for (const op of operatorRows) {
      results.push({
        id: `operator-${op.slug}`,
        title: op.name,
        subtitle: "Charging Network Operator",
        type: "operator",
        url: `/operators/${op.slug}`,
        metadata: { slug: op.slug },
      });
    }

    // 3. Search Stations
    const stationRows = await db
      .select({
        id: stations.id,
        slug: stations.slug,
        name: stations.name,
        address: stations.address,
        pincode: stations.pincode,
      })
      .from(stations)
      .where(
        or(
          ilike(stations.name, pattern),
          ilike(stations.address, pattern),
          ilike(stations.pincode, pattern),
        ),
      )
      .limit(limit);

    for (const s of stationRows) {
      results.push({
        id: `station-${s.slug}`,
        title: s.name,
        subtitle: s.address || `PIN: ${s.pincode}`,
        type: "station",
        url: `/stations/${s.slug}`,
        metadata: { slug: s.slug, pincode: s.pincode },
      });
    }

    // 4. Search Pincodes
    if (/^\d{1,6}$/.test(query.trim())) {
      const pinRows = await db
        .select({
          pincode: pincodes.pincode,
          district: pincodes.district,
        })
        .from(pincodes)
        .where(ilike(pincodes.pincode, pattern))
        .limit(limit);

      for (const p of pinRows) {
        results.push({
          id: `pin-${p.pincode}`,
          title: `PIN ${p.pincode}`,
          subtitle: p.district ? `District: ${p.district}` : "Postal Code",
          type: "pincode",
          url: `/pincode/${p.pincode}`,
          metadata: { pincode: p.pincode, district: p.district },
        });
      }
    }

    return results;
  }
}
