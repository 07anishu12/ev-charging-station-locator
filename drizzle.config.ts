import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

if (process.argv.some((arg) => arg.includes("migrate")) && !process.env.DATABASE_URL) {
  console.error(
    "Error: DATABASE_URL is not configured. Please set DATABASE_URL in .env.local or your environment.",
  );
  process.exit(1);
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
