import { describe, expect, it } from "vitest";

import { parseEnvironment } from "@/lib/config/env-schema";

describe("environment configuration", () => {
  it("uses a local site URL and leaves optional secrets unset by default", () => {
    expect(parseEnvironment({})).toEqual({
      databaseUrl: null,
      openChargeMapApiKey: null,
      siteUrl: "http://localhost:3000",
    });
  });

  it("parses configured server values without exposing them as public fields", () => {
    const result = parseEnvironment({
      DATABASE_URL: "postgresql://localhost/fastcharger",
      OPENCHARGEMAP_API_KEY: "server-key",
      NEXT_PUBLIC_SITE_URL: "https://fastcharger.example",
    });

    expect(result.databaseUrl).toBe("postgresql://localhost/fastcharger");
    expect(result.openChargeMapApiKey).toBe("server-key");
    expect(result.siteUrl).toBe("https://fastcharger.example");
  });
});
