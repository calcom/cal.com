import { afterEach, describe, expect, it, vi } from "vitest";
import { generateHashedLink } from "./generateHashedLink";

describe("generateHashedLink", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a non-empty string", () => {
    const result = generateHashedLink(1);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("different IDs produce different links at the same time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const link1 = generateHashedLink(1);
    const link2 = generateHashedLink(2);
    expect(link1).not.toBe(link2);
  });

  it("same ID at different times produces different links", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const link1 = generateHashedLink(1);
    vi.setSystemTime(new Date("2025-01-01T00:00:01Z"));
    const link2 = generateHashedLink(1);
    expect(link1).not.toBe(link2);
  });

  it("accepts numeric ID", () => {
    const result = generateHashedLink(42);
    expect(typeof result).toBe("string");
  });

  it("accepts string ID", () => {
    const result = generateHashedLink("my-event-type");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("same ID at same time produces same link (deterministic)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    const link1 = generateHashedLink(42);
    const link2 = generateHashedLink(42);
    expect(link1).toBe(link2);
  });
});
