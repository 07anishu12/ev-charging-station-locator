import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: path.join(__dirname,"src/schema/index.ts"),
  out: path.join(__dirname,"migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/fastcharger",
  },
  verbose: true,
  strict: true,
});
