import { describe, expect, it } from "vitest";

import { getTimeMin, getTimeMax } from "./datesForCache";

describe("getTimeMin", () => {
  // Tested on multiple dates
  // vi.setSystemTime("2030-04-21T00:00:13Z");
  it("should return start of current month when no date is passed", () => {
    const result = getTimeMin();
    const expected = new Date();
    expected.setUTCDate(1);
    expected.setUTCHours(0, 0, 0, 0);
    expect(result).toBe(expected.toISOString());
  });

  it("should return start of month for a given date", () => {
    const result = getTimeMin("2025-03-15T10:30:00Z");
    expect(result).toMatchInlineSnapshot(`"2025-03-01T00:00:00.000Z"`);
  });

  it("should handle dates at the start of month", () => {
    const result = getTimeMin("2026-03-01T00:00:00Z");
    expect(result).toMatchInlineSnapshot(`"2026-03-01T00:00:00.000Z"`);
  });

  it("should handle DST changes", () => {
    const result = getTimeMin("2024-10-27T01:30:00Z");
    expect(result).toMatchInlineSnapshot(`"2024-10-01T00:00:00.000Z"`);
  });
});

describe("getTimeMax", () => {
  it("should return the start of the overnext month when no date is passed", () => {
    const result = getTimeMax();
    const expected = new Date();
    expected.setUTCMonth(expected.getUTCMonth() + 2);
    expected.setUTCDate(1);
    expected.setUTCHours(0, 0, 0, 0);
    expect(result).toBe(expected.toISOString());
  });

  it("should return the start of overnext month for dates between start of current month and end of next month", () => {
    const testDate = "2024-03-15T10:30:00Z";
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-05-01T00:00:00.000Z"`);
  });

  it("should return end of month for dates beyond overnext month", () => {
    const testDate = "2024-05-15T10:30:00Z";
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-07-01T00:00:00.000Z"`);
  });

  it("should handle dates at the end of month", () => {
    const testDate = "2024-03-31T23:59:59Z";
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-05-01T00:00:00.000Z"`);
  });

  it("should handle October correctly (31 days)", () => {
    const testDate = "2024-10-15T10:30:00Z";
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-12-01T00:00:00.000Z"`);
  });

  it("should handle DST changes", () => {
    const testDate = "2024-10-27T01:30:00Z"; // DST change in Europe
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-12-01T00:00:00.000Z"`);
  });

  it("should handle dates around DST changes in next month", () => {
    const testDate = "2024-09-15T10:30:00Z"; // September, next month includes DST change
    const result = getTimeMax(testDate);
    expect(result).toMatchInlineSnapshot(`"2024-11-01T00:00:00.000Z"`);
  });
});
