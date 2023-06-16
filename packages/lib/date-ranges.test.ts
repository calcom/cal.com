import dayjs from "@calcom/dayjs";
import { describe, expect, it } from "vitest";

import { buildDateRanges, processDateOverride, processWorkingHours } from "./date-ranges";

describe("processWorkingHours", () => {
  it("should return the correct working hours given a specific availability, timezone, and date range", () => {
    const item = {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "America/New_York";
    const dateFrom = dayjs.utc().startOf("day").day(2).add(1, "week");
    const dateTo = dayjs.utc().endOf("day").day(3).add(1, "week");

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo });

    expect(results.length).toBe(2); // There should be two working days between the range
    // "America/New_York" day shifts -1, so we need to add a day to correct this shift.
    expect(results[0]).toEqual({
      start: dayjs(`${dateFrom.tz(timeZone).add(1, "day").format("YYYY-MM-DD")}T12:00:00Z`).tz(timeZone),
      end: dayjs(`${dateFrom.tz(timeZone).add(1, "day").format("YYYY-MM-DD")}T21:00:00Z`).tz(timeZone),
    });
    expect(results[1]).toEqual({
      start: dayjs(`${dateTo.tz(timeZone).format("YYYY-MM-DD")}T12:00:00Z`).tz(timeZone),
      end: dayjs(`${dateTo.tz(timeZone).format("YYYY-MM-DD")}T21:00:00Z`).tz(timeZone),
    });
  });
});

describe("processDateOverrides", () => {
  it("should return the correct date override given a specific availability, timezone, and date", () => {
    const item = {
      date: new Date(Date.UTC(2023, 5, 12, 8, 0)),
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    // 2023-06-12T20:00:00-04:00 (America/New_York)
    const timeZone = "America/New_York";

    const result = processDateOverride({ item, timeZone });

    expect(result.start.format()).toEqual(dayjs("2023-06-12T12:00:00Z").tz(timeZone).format());
    expect(result.end.format()).toEqual(dayjs("2023-06-12T21:00:00Z").tz(timeZone).format());
  });
});

describe("buildDateRanges", () => {
  it("should return the correct date ranges", () => {
    const items = [
      {
        date: new Date(Date.UTC(2023, 5, 13)),
        startTime: new Date(Date.UTC(0, 0, 0, 10, 0)), // 10 AM
        endTime: new Date(Date.UTC(0, 0, 0, 15, 0)), // 3 PM
      },
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
        endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
      },
    ];

    const dateFrom = dayjs("2023-06-13T00:00:00Z"); // 2023-06-12T20:00:00-04:00 (America/New_York)
    const dateTo = dayjs("2023-06-15T00:00:00Z");

    const timeZone = "America/New_York";

    const results = buildDateRanges({ availability: items, timeZone, dateFrom, dateTo });
    // [
    //  { s: '2023-06-13T10:00:00-04:00', e: '2023-06-13T15:00:00-04:00' },
    //  { s: '2023-06-14T08:00:00-04:00', e: '2023-06-14T17:00:00-04:00' }
    // ]

    expect(results.length).toBe(2);

    expect(results[0]).toEqual({
      start: dayjs("2023-06-13T14:00:00Z").tz(timeZone),
      end: dayjs("2023-06-13T19:00:00Z").tz(timeZone),
    });

    expect(results[1]).toEqual({
      start: dayjs("2023-06-14T12:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T21:00:00Z").tz(timeZone),
    });
  });
  it("should return correct date ranges with full day unavailable date override", () => {
    const items = [
      {
        date: new Date(Date.UTC(2023, 5, 13)),
        startTime: new Date(Date.UTC(0, 0, 0, 0, 0)),
        endTime: new Date(Date.UTC(0, 0, 0, 0, 0)),
      },
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)),
        endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)),
      },
    ];
    const timeZone = "Europe/London";


    const dateFrom = dayjs("2023-06-13T00:00:00Z");
    const dateTo = dayjs("2023-06-15T00:00:00Z");

    const results = buildDateRanges({ availability: items, timeZone, dateFrom, dateTo });

    expect(results[0]).toEqual({
      start: dayjs("2023-06-14T07:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T16:00:00Z").tz(timeZone),
    });

  })
});
