import { describe, expect, it } from "vitest";
import { getDateTimeInUtc } from "./getDateTimeInUtc";

describe("getDateTimeInUtc", () => {
  it("keeps the same instant for offset-aware timestamps", () => {
    const result = getDateTimeInUtc("2026-03-10T09:00:00-05:00", "America/New_York");

    expect(result.toISOString()).toBe("2026-03-10T14:00:00.000Z");
  });

  it("interprets offset-less timestamps in the provided timezone", () => {
    const result = getDateTimeInUtc("2026-03-10T09:00:00", "America/New_York");

    expect(result.toISOString()).toBe("2026-03-10T13:00:00.000Z");
  });
});
