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

  it("returns different values for different IDs at same time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const result1 = generateHashedLink(1);
    const result2 = generateHashedLink(2);
    expect(result1).not.toBe(result2);
  });

  it("returns different values at different times for same ID", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const result1 = generateHashedLink(1);
    vi.setSystemTime(new Date("2025-01-01T00:00:01Z"));
    const result2 = generateHashedLink(1);
    expect(result1).not.toBe(result2);
  });

  it("accepts numeric ID", () => {
    const result = generateHashedLink(42);
    expect(typeof result).toBe("string");
  });

  it("accepts string ID", () => {
    const result = generateHashedLink("my-event-type");
    expect(typeof result).toBe("string");
  });
});
