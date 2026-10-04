export const configDefaults = {
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  search: {
    defaultRadiusKm: 25,
    maxRadiusKm: 100,
  },
} as const;
