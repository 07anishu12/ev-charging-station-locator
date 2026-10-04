import {
  EVENT_COLLECTIONS,
  EVENT_TYPES,
  getEventStore,
  MongoEventStore,
} from "@fastcharger/database";
import { DrizzleSearchRepository, type ISearchRepository, type SearchEntity } from "../repositories/search.repository";
import { PincodeService, defaultPincodeService } from "./pincode.service";

export class SearchService {
  constructor(
    private readonly searchRepo: ISearchRepository = new DrizzleSearchRepository(),
    private readonly pincodeService: PincodeService = defaultPincodeService,
    private readonly eventStore: MongoEventStore = getEventStore(),
  ) {}

  async search(params: { q: string; page: number; pageSize: number; radiusKm?: number }) {
    const cleanQ = params.q.trim();

    // 1. If 6-digit Indian PIN code, run geographic discovery
    if (/^\d{6}$/.test(cleanQ)) {
      const pinResult = await this.pincodeService.getPincodeStationData(cleanQ, {
        page: params.page,
        limit: params.pageSize,
        radiusKm: params.radiusKm || 10,
      });

      // Asynchronous search analytics event recording with strict failure isolation
      this.recordSearchAnalytics(cleanQ, "pincode", pinResult?.total ?? 0);

      return {
        searchType: "pincode",
        query: cleanQ,
        ...pinResult,
      };
    }

    // 2. Otherwise multi-entity database search
    const allEntities = await this.searchRepo.searchEntities(cleanQ, 100);

    const categorized: {
      cities: SearchEntity[];
      stations: SearchEntity[];
      operators: SearchEntity[];
      pincodes: SearchEntity[];
    } = {
      cities: [],
      stations: [],
      operators: [],
      pincodes: [],
    };

    for (const item of allEntities) {
      if (item.type === "city") categorized.cities.push(item);
      else if (item.type === "station") categorized.stations.push(item);
      else if (item.type === "operator") categorized.operators.push(item);
      else if (item.type === "pincode") categorized.pincodes.push(item);
    }

    const offset = (params.page - 1) * params.pageSize;
    const pagedItems = allEntities.slice(offset, offset + params.pageSize);

    // Asynchronous search analytics event recording with strict failure isolation
    this.recordSearchAnalytics(cleanQ, "text", allEntities.length);

    return {
      searchType: "text",
      query: cleanQ,
      items: pagedItems,
      categorized,
      resultCount: allEntities.length,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total: allEntities.length,
        totalPages: Math.max(1, Math.ceil(allEntities.length / params.pageSize)),
        hasMore: offset + params.pageSize < allEntities.length,
      },
    };
  }

  private recordSearchAnalytics(query: string, searchType: string, resultCount: number): void {
    try {
      this.eventStore
        .recordEvent(EVENT_COLLECTIONS.SEARCH_ANALYTICS_EVENTS, {
          eventId: crypto.randomUUID(),
          eventType: EVENT_TYPES.SEARCH_QUERY_EXECUTED,
          timestamp: new Date(),
          source: "fastcharger-backend",
          correlationId: `search-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          entityId: null,
          payload: {
            query,
            searchType,
            resultCount,
          },
          version: 1,
        })
        .catch(() => {
          // Failure isolation: Mongo unavailability must never affect search response
        });
    } catch {
      // Failure isolation: synchronous throw protection
    }
  }
}

export const defaultSearchService = new SearchService();
