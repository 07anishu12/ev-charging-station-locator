import type { Context } from "hono";
import { SearchService, defaultSearchService } from "../services/search.service";
import { searchQuerySchema } from "../validators/search.validator";
import { validateQuery } from "../middleware/validator";

export class SearchController {
  constructor(private readonly searchService: SearchService = defaultSearchService) {}

  search = async (c: Context) => {
    const query = validateQuery(searchQuerySchema, c);
    const result = await this.searchService.search(query);
    return c.json({ data: result }, 200);
  };
}

export const defaultSearchController = new SearchController();
