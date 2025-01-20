import { describe, it, expect } from "vitest";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { getAggregatedAvailability } from ".";

describe("getAggregatedAvailability", () => {
  // This test shouldn't pass; but highlights the issue.
  it("should ensure either host is available between 11:00 and 11:30 on January 23, 2025", () => {
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
    const timeRangeToCheck = {
      start: dayjs("2025-01-23T11:00:00.000Z"),
      end: dayjs("2025-01-23T11:30:00.000Z"),
    };
    // Helper to check if a time range overlaps with availability
    const isAvailable = (
      availability: { start: Dayjs; end: Dayjs }[],
      range: { start: Dayjs; end: Dayjs }
    ) => {
      return availability.some(({ start, end }) => {
        return start <= range.end && end >= range.start;
      });
    };
    expect(isAvailable(result, timeRangeToCheck)).toBe(true);
  });
});
