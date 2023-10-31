import { expect, describe, it } from "vitest";

import { getAggregatedAvailability } from "@calcom/core/getAggregatedAvailability";
import dayjs from "@calcom/dayjs";
import { buildDateRanges } from "@calcom/lib/date-ranges";

describe("aggregated availability for round robin with multiple hosts", () => {
  it("should return a valid dateRange since both users share the same availability", () => {
    const testAvailability = buildDateRanges({
      availability: [
        {
          date: new Date(Date.UTC(2023, 5, 13)),
          startTime: new Date(Date.UTC(0, 0, 0, 22, 0)),
          endTime: new Date(Date.UTC(0, 0, 0, 23, 0)),
        },
      ],
      timeZone: "America/New_York",
      dateFrom: dayjs("2023-06-13T00:00:00Z"),
      dateTo: dayjs("2023-06-15T00:00:00Z"),
    });

    const results = getAggregatedAvailability(
      [
        { dateRanges: testAvailability, user: { isFixed: false } },
        { dateRanges: testAvailability, user: { isFixed: false } },
      ],
      null,
      2
    );

    expect(results.length).toBe(1);
  });

  it("should not return a dateRange since there are not enough users available", () => {
    const testAvailability = buildDateRanges({
      availability: [
        {
          date: new Date(Date.UTC(2023, 5, 13)),
          startTime: new Date(Date.UTC(0, 0, 0, 22, 0)),
          endTime: new Date(Date.UTC(0, 0, 0, 23, 0)),
        },
      ],
      timeZone: "America/New_York",
      dateFrom: dayjs("2023-06-13T00:00:00Z"),
      dateTo: dayjs("2023-06-15T00:00:00Z"),
    });

    const results = getAggregatedAvailability(
      [
        { dateRanges: testAvailability, user: { isFixed: false } },
        { dateRanges: testAvailability, user: { isFixed: false } },
      ],
      null,
      3
    );

    expect(results.length).toBe(0);
  });
});
