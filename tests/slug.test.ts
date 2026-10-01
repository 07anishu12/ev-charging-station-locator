import { describe, expect, it } from "vitest";

import { createSlug } from "@/lib/search/slug";

describe("createSlug", () => {
  it("creates stable URL-safe slugs", () => {
    expect(createSlug("  New Delhi — Connaught Place  ")).toBe("new-delhi-connaught-place");
  });
});
