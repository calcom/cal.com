import { describe, it, expect } from "vitest";

import dayjs from "@calcom/dayjs";

import { filterRedundantDateRanges } from "./filterRedundantDateRanges";

describe("filterRedundantDateRanges", () => {
  it("should remove date ranges that are completely contained within others", () => {
    const dateRanges = [
      { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T12:00:00.000Z") },
      { start: dayjs("2025-01-23T11:15:00.000Z"), end: dayjs("2025-01-23T11:45:00.000Z") }, // Contained within the first range
      { start: dayjs("2025-01-23T13:00:00.000Z"), end: dayjs("2025-01-23T14:00:00.000Z") },
    ];

    const result = filterRedundantDateRanges(dateRanges);

    expect(result.length).toBe(2);
    expect(result[0].start.format()).toEqual(dayjs("2025-01-23T11:00:00.000Z").format());
    expect(result[0].end.format()).toEqual(dayjs("2025-01-23T12:00:00.000Z").format());
    expect(result[1].start.format()).toEqual(dayjs("2025-01-23T13:00:00.000Z").format());
    expect(result[1].end.format()).toEqual(dayjs("2025-01-23T14:00:00.000Z").format());
  });

  it("should not remove overlapping ranges that aren't completely contained", () => {
    const dateRanges = [
      { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T12:00:00.000Z") },
      { start: dayjs("2025-01-23T11:30:00.000Z"), end: dayjs("2025-01-23T12:30:00.000Z") }, // Overlaps but not contained
      { start: dayjs("2025-01-23T13:00:00.000Z"), end: dayjs("2025-01-23T14:00:00.000Z") },
    ];

    const result = filterRedundantDateRanges(dateRanges);

    expect(result.length).toBe(3);
  });

  it("should return an empty array when given an empty array", () => {
    expect(filterRedundantDateRanges([])).toEqual([]);
  });

  it("should return the same array when there's only one range", () => {
    const dateRanges = [{ start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T12:00:00.000Z") }];

    expect(filterRedundantDateRanges(dateRanges)).toEqual(dateRanges);
  });
});
