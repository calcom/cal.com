import dayjs from "@calcom/dayjs";

import { buildDateRanges, processDateOverride, processWorkingHours } from "./date-ranges";

describe("processWorkingHours", () => {
  it("should return the correct working hours given a specific availability, timezone, and date range", () => {
    const item = {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "America/New_York";
    const dateFrom = dayjs("2023-06-13T00:00:00Z");
    const dateTo = dayjs("2023-06-15T00:00:00Z");

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo });

    expect(results.length).toBe(2); // There should be two working days between the range
    expect(results[0]).toEqual({
      start: dayjs("2023-06-13T00:00:00Z").tz(timeZone),
      end: dayjs("2023-06-12T21:00:00Z").tz(timeZone),
    });
    expect(results[1]).toEqual({
      start: dayjs("2023-06-13T12:00:00Z").tz(timeZone),
      end: dayjs("2023-06-13T21:00:00Z").tz(timeZone),
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

    expect(result).toEqual({
      start: dayjs("2023-06-13T00:00:00Z").tz(timeZone),
      end: dayjs("2023-06-12T21:00:00Z").tz(timeZone),
    });
  });
});

describe("buildDateRanges", () => {
  it("should return the correct date override given a specific availability, timezone, and date", () => {
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

    expect(results.length).toBe(2);

    expect(results[0]).toEqual({
      start: dayjs.tz("2023-06-12T12:00:00").tz(timeZone),
      end: dayjs("2023-06-12T21:00:00Z").tz(timeZone),
    });

    expect(results[1]).toEqual({
      start: dayjs("2023-06-13T14:00:00Z").tz(timeZone),
      end: dayjs("2023-06-13T19:00:00Z").tz(timeZone),
    });
  });
});
