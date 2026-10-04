import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@fastcharger/shared": path.resolve(__dirname, "shared/src"),
      "@fastcharger/database": path.resolve(__dirname, "database/src"),
      "@fastcharger/backend": path.resolve(__dirname, "backend/src"),
      "@fastcharger/worker": path.resolve(__dirname, "worker/src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "backend/tests/**/*.test.ts"],
  },
});

