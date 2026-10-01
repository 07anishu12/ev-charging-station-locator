import { customType, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType: () => "geography(Point,4326)",
});

export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    address: text("address"),
    location: geographyPoint("location").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("stations_location_gist_idx").using("gist", table.location)],
);
