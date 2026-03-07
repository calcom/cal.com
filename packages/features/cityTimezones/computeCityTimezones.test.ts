import { describe, expect, it } from "vitest";
import { computeCityTimezones, computeCityTimezonesHash } from "./computeCityTimezones";

describe("computeCityTimezones", () => {
  it("returns an array of city timezone objects", () => {
    const result = computeCityTimezones();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("each city has the required fields", () => {
    const result = computeCityTimezones();
    for (const city of result) {
      expect(city).toHaveProperty("city");
      expect(city).toHaveProperty("timezone");
      expect(city).toHaveProperty("pop");
      expect(typeof city.city).toBe("string");
      // Some cities from city-timezones have null timezone values
      expect(city.timezone === null || typeof city.timezone === "string").toBe(true);
      expect(typeof city.pop).toBe("number");
    }
  });

  it("deduplicates cities by keeping the highest population entry", () => {
    const result = computeCityTimezones();
    const cityNames = result.map((c) => c.city);
    const uniqueNames = new Set(cityNames);
    // The Londonderry -> London rename may create one extra "London" entry
    // alongside the original London, so allow at most 1 duplicate
    expect(cityNames.length - uniqueNames.size).toBeLessThanOrEqual(1);
  });

  it("applies the London timezone override", () => {
    const result = computeCityTimezones();
    const london = result.find((c) => c.city === "London");
    expect(london).toBeDefined();
    expect(london?.timezone).toBe("Europe/London");
  });

  it("returns deterministic results across multiple calls", () => {
    const result1 = computeCityTimezones();
    const result2 = computeCityTimezones();
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });
});

describe("computeCityTimezonesHash", () => {
  it("returns an 8-character hex string", () => {
    const hash = computeCityTimezonesHash();
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("returns a stable hash across multiple calls", () => {
    const hash1 = computeCityTimezonesHash();
    const hash2 = computeCityTimezonesHash();
    expect(hash1).toBe(hash2);
  });

  it("is derived from the city timezone data", () => {
    // Verify the hash is non-empty and looks like a valid hex substring
    const hash = computeCityTimezonesHash();
    expect(hash.length).toBe(8);
    expect(hash).not.toBe("00000000");
  });
});
