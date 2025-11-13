import { describe, it, expect } from "vitest";

/**
 * Normalize incoming slug because URL slugs may contain repeated hyphens but DB slugs are stored normalized.
 * Collapses multiple consecutive hyphens to single hyphens and trims leading/trailing hyphens.
 */
function normalizeSlug(s: string): string {
  return s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

describe("normalizeSlug", () => {
  it("should collapse multiple consecutive hyphens to single hyphen", () => {
    expect(normalizeSlug("some--team---wow")).toBe("some-team-wow");
  });

  it("should trim leading and trailing hyphens", () => {
    expect(normalizeSlug("--hello--")).toBe("hello");
  });

  it("should collapse triple hyphens in the middle", () => {
    expect(normalizeSlug("wow---ok")).toBe("wow-ok");
  });

  it("should handle already normalized slugs", () => {
    expect(normalizeSlug("normal-slug")).toBe("normal-slug");
  });

  it("should handle single word slugs", () => {
    expect(normalizeSlug("hello")).toBe("hello");
  });

  it("should handle slugs with only hyphens", () => {
    expect(normalizeSlug("---")).toBe("");
  });

  it("should trim leading hyphens only", () => {
    expect(normalizeSlug("---hello")).toBe("hello");
  });

  it("should trim trailing hyphens only", () => {
    expect(normalizeSlug("hello---")).toBe("hello");
  });

  it("should handle mixed consecutive hyphens", () => {
    expect(normalizeSlug("a--b---c----d")).toBe("a-b-c-d");
  });

  it("should preserve single hyphens between words", () => {
    expect(normalizeSlug("hello-world-test")).toBe("hello-world-test");
  });
});
