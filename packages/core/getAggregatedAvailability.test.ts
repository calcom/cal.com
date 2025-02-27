import { describe, it, expect } from "vitest";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { getAggregatedAvailability } from "./getAggregatedAvailability";

// Helper to check if a time range overlaps with availability
const isAvailable = (availability: { start: Dayjs; end: Dayjs }[], range: { start: Dayjs; end: Dayjs }) => {
  return availability.some(({ start, end }) => {
    return start <= range.start && end >= range.end;
  });
};

describe("getAggregatedAvailability", () => {
  // rr-host availability used to combine into erroneous slots, this confirms it no longer happens
  it("should not merge RR availability resulting in an unavailable slot due to overlap", () => {
    const userAvailability = [
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:20:00.000Z") },
          { start: dayjs("2025-01-23T16:10:00.000Z"), end: dayjs("2025-01-23T16:30:00.000Z") },
        ],
        user: { isFixed: false },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:15:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
          { start: dayjs("2025-01-23T13:20:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
        ],
        user: { isFixed: false },
      },
    ];

    const result = getAggregatedAvailability(userAvailability, "ROUND_ROBIN");
    const timeRangeToCheckBusy = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:30:00.000Z"),
    };

    expect(isAvailable(result, timeRangeToCheckBusy)).toBe(false);

    const timeRangeToCheckAvailable = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:20:00.000Z"),
    };

    expect(isAvailable(result, timeRangeToCheckAvailable)).toBe(true);
  });

  it("it returns the right amount of date ranges even if the end time is before the start time", () => {
    const userAvailability = [
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-27T14:00:00.000Z"), end: dayjs("2025-01-27T04:30-05:00") },
        ],
        user: { isFixed: false },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-27T14:00:00.000Z"), end: dayjs("2025-01-27T14:45:00.000Z") },
        ],
        user: { isFixed: false },
      },
    ];

    const result = getAggregatedAvailability(userAvailability, "ROUND_ROBIN");

    expect(result).toEqual([
      {
        start: dayjs("2025-01-27T14:00:00.000Z"),
        end: dayjs("2025-01-27T09:30:00.000Z"),
      },
      {
        start: dayjs("2025-01-27T14:00:00.000Z"),
        end: dayjs("2025-01-27T14:45:00.000Z"),
      },
    ]);
  });

  // validates fixed host behaviour, they all have to be available
  it("correctly joins fixed host availability resulting in one or more combined date ranges", () => {
    const userAvailability = [
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:20:00.000Z") },
          { start: dayjs("2025-01-23T16:10:00.000Z"), end: dayjs("2025-01-23T16:30:00.000Z") },
        ],
        user: { isFixed: true },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:15:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
          { start: dayjs("2025-01-23T13:20:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
        ],
        user: { isFixed: true },
      },
    ];

    const result = getAggregatedAvailability(userAvailability, "ROUND_ROBIN");
    const timeRangeToCheckBusy = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:30:00.000Z"),
    };

    expect(isAvailable(result, timeRangeToCheckBusy)).toBe(false);

    expect(result[0].start.format()).toEqual(dayjs("2025-01-23T11:15:00.000Z").format());
    expect(result[0].end.format()).toEqual(dayjs("2025-01-23T11:20:00.000Z").format());
  });

  // Combines rr hosts and fixed hosts, both fixed and one of the rr hosts has to be available for the whole period
  // All fixed user ranges are merged with each rr-host
  it("Fixed hosts and at least one rr host available between 11:00-11:30 & 12:30-13:00 on January 23, 2025", () => {
    // Both fixed user A and B are available 11:00-11:30 & 12:30-13:00 & 13:15-13:30
    // Only user C (rr) is available 11:00-11:30 and only user D (rr) is available 12:30-13:00
    // No rr users are available 13:15-13:30 and this date range should not be a result.
    const userAvailability = [
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
          { start: dayjs("2025-01-23T12:30:00.000Z"), end: dayjs("2025-01-23T13:00:00.000Z") },
          { start: dayjs("2025-01-23T13:15:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
          { start: dayjs("2025-01-23T16:10:00.000Z"), end: dayjs("2025-01-23T16:30:00.000Z") },
        ],
        user: { isFixed: true },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
          { start: dayjs("2025-01-23T12:30:00.000Z"), end: dayjs("2025-01-23T13:00:00.000Z") },
          { start: dayjs("2025-01-23T13:15:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
          { start: dayjs("2025-01-23T13:20:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
        ],
        user: { isFixed: true },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
        ],
        user: { isFixed: false },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T12:30:00.000Z"), end: dayjs("2025-01-23T13:00:00.000Z") },
        ],
        user: { isFixed: false },
      },
    ];

    const result = getAggregatedAvailability(userAvailability, "ROUND_ROBIN");
    const timeRangeToCheckAvailable = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:30:00.000Z"),
    };

    expect(isAvailable(result, timeRangeToCheckAvailable)).toBe(true);

    expect(result[0].start.format()).toEqual(dayjs("2025-01-23T11:00:00.000Z").format());
    expect(result[0].end.format()).toEqual(dayjs("2025-01-23T11:30:00.000Z").format());
    expect(result[1].start.format()).toEqual(dayjs("2025-01-23T12:30:00.000Z").format());
    expect(result[1].end.format()).toEqual(dayjs("2025-01-23T13:00:00.000Z").format());
  });

  it("does not duplicate slots when multiple rr-hosts offer the same availability", () => {
    const userAvailability = [
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
          { start: dayjs("2025-01-23T12:30:00.000Z"), end: dayjs("2025-01-23T13:00:00.000Z") },
          { start: dayjs("2025-01-23T13:15:00.000Z"), end: dayjs("2025-01-23T13:30:00.000Z") },
          { start: dayjs("2025-01-23T16:10:00.000Z"), end: dayjs("2025-01-23T16:30:00.000Z") },
        ],
        user: { isFixed: true },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
        ],
        user: { isFixed: false },
      },
      {
        dateRanges: [],
        oooExcludedDateRanges: [
          { start: dayjs("2025-01-23T11:00:00.000Z"), end: dayjs("2025-01-23T11:30:00.000Z") },
        ],
        user: { isFixed: false },
      },
    ];

    const result = getAggregatedAvailability(userAvailability, "ROUND_ROBIN");
    const timeRangeToCheckAvailable = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:30:00.000Z"),
    };

    expect(isAvailable(result, timeRangeToCheckAvailable)).toBe(true);
    expect(result.length).toBe(1);
  });
});
