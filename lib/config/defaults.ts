export const configDefaults = {
  search: {
    defaultRadiusKm: 10,
    maxRadiusKm: 100,
  },
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  cache: {
    stationListTtlSeconds: 300,
    stationDetailTtlSeconds: 900,
  },
} as const;
