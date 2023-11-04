import { describe, it, expect } from "vitest";

import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/lib/date-ranges";

import { mergeOverlappingDateRanges } from ".";

const november2 = "2023-11-02";
const november3 = "2023-11-03";

describe("mergeOverlappingDateRanges", () => {
  it("should merge all ranges into one when one range includes all others", () => {
    const dateRanges = [
      createDateRange(`${november2}T23:00:00.000Z`, `${november3}T07:00:00.000Z`), // Includes all others
      createDateRange(`${november2}T23:15:00.000Z`, `${november3}T00:00:00.000Z`),
      createDateRange(`${november3}T00:15:00.000Z`, `${november3}T01:00:00.000Z`),
      createDateRange(`${november3}T01:15:00.000Z`, `${november3}T02:00:00.000Z`),
    ];

    const mergedRanges = mergeOverlappingDateRanges(dateRanges);
    expect(mergedRanges).toHaveLength(1);
    expect(mergedRanges[0].start.isSame(dayjs(dateRanges[0].start))).toBe(true);
    expect(mergedRanges[0].end.isSame(dayjs(dateRanges[0].end))).toBe(true);
  });

  it("should merge only overlapping ranges over 2 days and leave non-overlapping ranges as is", () => {
    const dateRanges = [
      createDateRange(`${november2}T23:00:00.000Z`, `${november3}T07:00:00.000Z`),
      createDateRange(`${november3}T05:00:00.000Z`, `${november3}T06:00:00.000Z`),
      createDateRange(`${november3}T08:00:00.000Z`, `${november3}T10:00:00.000Z`), // This range should not be merged
    ];

    const mergedRanges = mergeOverlappingDateRanges(dateRanges);
    expect(mergedRanges).toHaveLength(2);
    expect(mergedRanges[0].start.isSame(dayjs(dateRanges[0].start))).toBe(true);
    expect(mergedRanges[0].end.isSame(dayjs(dateRanges[0].end))).toBe(true);
    expect(mergedRanges[1].start.isSame(dayjs(dateRanges[2].start))).toBe(true);
    expect(mergedRanges[1].end.isSame(dayjs(dateRanges[2].end))).toBe(true);
  });

  it("should merge ranges that overlap on the same day", () => {
    const dateRanges = [
      createDateRange(`${november2}T01:00:00.000Z`, `${november2}T04:00:00.000Z`),
      createDateRange(`${november2}T02:00:00.000Z`, `${november2}T03:00:00.000Z`), // This overlaps with the first range
      createDateRange(`${november2}T05:00:00.000Z`, `${november2}T06:00:00.000Z`), // This doesn't overlap with above
    ];

    const mergedRanges = mergeOverlappingDateRanges(dateRanges);
    expect(mergedRanges).toHaveLength(2);
    expect(mergedRanges[0].start.isSame(dayjs(dateRanges[0].start))).toBe(true);
    expect(mergedRanges[0].end.isSame(dayjs(dateRanges[0].end))).toBe(true);
    expect(mergedRanges[1].start.isSame(dayjs(dateRanges[2].start))).toBe(true);
    expect(mergedRanges[1].end.isSame(dayjs(dateRanges[2].end))).toBe(true);
  });
});

function createDateRange(start: string, end: string): DateRange {
  return {
    start: dayjs(start),
    end: dayjs(end),
  };
}
