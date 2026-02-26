import { describe, expect, it } from "vitest";
import { IntlSupportedTimeZones } from "./timeZones";

describe("IntlSupportedTimeZones", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(IntlSupportedTimeZones)).toBe(true);
    expect(IntlSupportedTimeZones.length).toBeGreaterThan(0);
  });

  it("contains common timezones (America/New_York, Europe/London, Asia/Tokyo)", () => {
    expect(IntlSupportedTimeZones).toContain("America/New_York");
    expect(IntlSupportedTimeZones).toContain("Europe/London");
    expect(IntlSupportedTimeZones).toContain("Asia/Tokyo");
  });

  it("contains all major region prefixes (Africa, America, Asia, Europe, Pacific, etc.)", () => {
    const regions = ["Africa", "America", "Asia", "Europe", "Pacific", "Atlantic", "Australia", "Indian"];
    for (const region of regions) {
      const hasRegion = IntlSupportedTimeZones.some((tz) => tz.startsWith(`${region}/`));
      expect(hasRegion).toBe(true);
    }
  });

  it("has no duplicate entries", () => {
    const uniqueSet = new Set(IntlSupportedTimeZones);
    expect(uniqueSet.size).toBe(IntlSupportedTimeZones.length);
  });

  it("all entries are valid IANA timezone strings (can be used with Intl.DateTimeFormat)", () => {
    for (const tz of IntlSupportedTimeZones) {
      expect(() => {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      }).not.toThrow();
    }
  });

  it("is a readonly array (const assertion)", () => {
    expect(IntlSupportedTimeZones).toBeDefined();
    expect(IntlSupportedTimeZones.length).toBeGreaterThan(400);
  });
});
