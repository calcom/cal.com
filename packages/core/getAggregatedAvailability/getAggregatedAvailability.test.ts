import { describe, it, expect } from "vitest";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { getAggregatedAvailability } from ".";

// Helper to check if a time range overlaps with availability
const isAvailable = (availability: { start: Dayjs; end: Dayjs }[], range: { start: Dayjs; end: Dayjs }) => {
  return availability.some(({ start, end }) => {
    return start <= range.start && end >= range.end;
  });
};

describe("getAggregatedAvailability", () => {
  // rr-host availability used to combine into erroneous slots, this confirms it no longer happens
  it("should have no host available between 11:00 and 11:30 on January 23, 2025", () => {
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
  // validates fixed host behaviour, they all have to be available
  it("should only have all fixed hosts available between 11:15 and 11:20 on January 23, 2025", () => {
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
});
