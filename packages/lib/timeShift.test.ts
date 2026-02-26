import { describe, expect, it } from "vitest";
import { getFirstShiftFlags, getTimeShiftFlags } from "./timeShift";

describe("getTimeShiftFlags", () => {
  it("returns empty array for empty dates", () => {
    expect(getTimeShiftFlags({ dates: [], timezone: "America/New_York" })).toEqual([]);
  });

  it("returns [false] for single date", () => {
    const result = getTimeShiftFlags({
      dates: ["2025-06-15T14:00:00Z"],
      timezone: "UTC",
    });
    expect(result).toEqual([false]);
  });

  it("returns all false when all dates have same local time", () => {
    const result = getTimeShiftFlags({
      dates: ["2025-06-15T14:00:00Z", "2025-06-22T14:00:00Z", "2025-06-29T14:00:00Z"],
      timezone: "UTC",
    });
    expect(result).toEqual([false, false, false]);
  });

  it("detects time shift across DST boundary", () => {
    // March 9, 2025 is when US clocks spring forward
    // In America/New_York: before DST = UTC-5, after DST = UTC-4
    // A weekly event at 14:00 UTC would be 9:00 AM EST, then 10:00 AM EDT
    const result = getTimeShiftFlags({
      dates: ["2025-03-02T14:00:00Z", "2025-03-09T14:00:00Z", "2025-03-16T14:00:00Z"],
      timezone: "America/New_York",
    });
    // First is always false (baseline), second may shift, third same as second
    expect(result[0]).toBe(false);
    expect(result[1]).toBe(true);
    expect(result[2]).toBe(true);
  });

  it("first occurrence is always false (baseline)", () => {
    const result = getTimeShiftFlags({
      dates: ["2025-01-15T14:00:00Z", "2025-07-15T14:00:00Z"],
      timezone: "America/New_York",
    });
    expect(result[0]).toBe(false);
  });

  it("handles Date objects as well as strings", () => {
    const result = getTimeShiftFlags({
      dates: [new Date("2025-06-15T14:00:00Z"), new Date("2025-06-22T14:00:00Z")],
      timezone: "UTC",
    });
    expect(result).toEqual([false, false]);
  });
});

describe("getFirstShiftFlags", () => {
  it("returns all false when no shifts exist", () => {
    expect(getFirstShiftFlags([false, false, false])).toEqual([false, false, false]);
  });

  it("marks only the first true as true", () => {
    expect(getFirstShiftFlags([false, true, true, true])).toEqual([false, true, false, false]);
  });

  it("returns empty array for empty input", () => {
    expect(getFirstShiftFlags([])).toEqual([]);
  });

  it("handles single shift at the beginning", () => {
    expect(getFirstShiftFlags([true, false, false])).toEqual([true, false, false]);
  });

  it("handles shift in the middle only", () => {
    expect(getFirstShiftFlags([false, false, true, false])).toEqual([false, false, true, false]);
  });
});
