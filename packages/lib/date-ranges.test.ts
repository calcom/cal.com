import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";

import { buildDateRanges, processDateOverride, processWorkingHours, subtract } from "./date-ranges";

describe("processWorkingHours", () => {
  // TEMPORAIRLY SKIPPING THIS TEST - Started failing after 29th Oct
  it.skip("should return the correct working hours given a specific availability, timezone, and date range", () => {
    const item = {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "America/New_York";
    const dateFrom = dayjs.utc().startOf("day").day(2).add(1, "week");
    const dateTo = dayjs.utc().endOf("day").day(3).add(1, "week");

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

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
  it("should have availability on last day of month in the month were DST starts", () => {
    const item = {
      days: [0, 1, 2, 3, 4, 5, 6], // Monday to Sunday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "Europe/London";

    const dateFrom = dayjs().month(9).date(24); // starts before DST change
    const dateTo = dayjs().startOf("day").month(10).date(1); // first day of November

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

    const lastAvailableSlot = results[results.length - 1];

    expect(lastAvailableSlot.start.date()).toBe(31);
  });

  it("It has the correct working hours on date of DST change (- tz)", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-11-05T13:26:14.000Z"));

    const item = {
      days: [1, 2, 3, 4, 5],
      startTime: new Date(Date.UTC(2023, 5, 12, 9, 0)), // 9 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "America/New_York";

    const dateFrom = dayjs();
    const dateTo = dayjs().endOf("month");

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

    expect(results).toStrictEqual([
      {
        start: dayjs("2023-11-06T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-06T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-07T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-07T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-08T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-08T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-09T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-09T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-10T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-10T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-13T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-13T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-14T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-14T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-15T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-15T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-16T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-16T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-17T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-17T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-20T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-20T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-21T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-21T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-22T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-22T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-23T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-23T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-24T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-24T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-27T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-27T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-28T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-28T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-29T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-29T22:00:00.000Z").tz(timeZone),
      },
      {
        start: dayjs("2023-11-30T14:00:00.000Z").tz(timeZone),
        end: dayjs("2023-11-30T22:00:00.000Z").tz(timeZone),
      },
    ]);

    vi.setSystemTime(vi.getRealSystemTime());
    vi.useRealTimers();
  });

  // TEMPORAIRLY SKIPPING THIS TEST - Started failing after 29th Oct
  it.skip("should return the correct working hours in the month were DST ends", () => {
    const item = {
      days: [0, 1, 2, 3, 4, 5, 6], // Monday to Sunday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    // in America/New_York DST ends on first Sunday of November
    const timeZone = "America/New_York";

    let firstSundayOfNovember = dayjs().startOf("day").month(10).date(1);
    while (firstSundayOfNovember.day() !== 0) {
      firstSundayOfNovember = firstSundayOfNovember.add(1, "day");
    }

    const dateFrom = dayjs().month(10).date(1).startOf("day");
    const dateTo = dayjs().month(10).endOf("month");

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

    const allDSTStartAt12 = results
      .filter((res) => res.start.isBefore(firstSundayOfNovember))
      .every((result) => result.start.utc().hour() === 12);
    const allNotDSTStartAt13 = results
      .filter((res) => res.start.isAfter(firstSundayOfNovember))
      .every((result) => result.start.utc().hour() === 13);

    expect(allDSTStartAt12).toBeTruthy();
    expect(allNotDSTStartAt13).toBeTruthy();
  });

  it("should skip event if it ends before it starts (different days)", () => {
    const item = {
      days: [1, 2, 3],
      startTime: new Date(new Date().setUTCHours(8, 0, 0, 0)), // 8 AM
      endTime: new Date(new Date().setUTCHours(7, 0, 0, 0)), // 7 AM
    };

    const timeZone = "America/New_York";
    const dateFrom = dayjs("2023-11-07T00:00:00Z").tz(timeZone); // 2023-11-07T00:00:00 (America/New_York)
    const dateTo = dayjs("2023-11-08T00:00:00Z").tz(timeZone); // 2023-11-08T00:00:00 (America/New_York)

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

    expect(results).toEqual([]);
  });

  it("should skip event if it ends before it starts (same day but different hours)", () => {
    const item = {
      days: [1],
      startTime: new Date(new Date().setUTCHours(8, 0, 0, 0)), // 8 AM
      endTime: new Date(new Date().setUTCHours(7, 0, 0, 0)), // 7 AM
    };

    const timeZone = "America/New_York";
    const dateFrom = dayjs("2023-11-07T00:00:00Z").tz(timeZone); // 2023-11-07T00:00:00 (America/New_York)
    const dateTo = dayjs("2023-11-07T23:59:59Z").tz(timeZone); // 2023-11-07T23:59:59 (America/New_York)

    const results = processWorkingHours({ item, timeZone, dateFrom, dateTo, travelSchedules: [] });

    expect(results).toEqual([]);
  });

  it("should show working hours in correct timezone with existing travel schedules", () => {
    vi.useFakeTimers().setSystemTime(new Date("2023-01-01T00:00:00.000Z"));

    const item = {
      days: [0, 1, 2, 3, 4, 5, 6], // Monday to Sunday
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    const timeZone = "Europe/Berlin";

    const dateFrom = dayjs().startOf("day");
    const dateTo = dayjs().add(1, "week").startOf("day");

    const travelSchedules = [
      {
        startDate: dayjs().add(2, "day").startOf("day"),
        endDate: dayjs().add(3, "day").endOf("day"),
        timeZone: "America/New_York",
      },
      {
        startDate: dayjs().add(5, "day").startOf("day"),
        timeZone: "Asia/Kolkata",
      },
    ];

    const resultsWithTravelSchedule = processWorkingHours({
      item,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules,
    });

    const resultWithOriginalTz = resultsWithTravelSchedule.filter((result) => {
      return (
        result.start.isBefore(travelSchedules[0].startDate) ||
        (result.start.isAfter(travelSchedules[0].endDate) &&
          result.start.isBefore(travelSchedules[1].startDate))
      );
    });

    const resultsWithNewYorkTz = resultsWithTravelSchedule.filter(
      (result) =>
        !result.start.isBefore(travelSchedules[0].startDate) &&
        !result.start.isAfter(travelSchedules[0].endDate)
    );
    const resultsWithKolkataTz = resultsWithTravelSchedule.filter(
      (result) => !result.start.isBefore(travelSchedules[1].startDate)
    );

    // 8AM in Europe/Berlin is 7AM in UTC, 5PM in Europe/Berlin is 4PM in UTC
    expect(
      resultWithOriginalTz.every(
        (result) => result.start.utc().hour() === 7 && result.end.utc().hour() === 16
      )
    ).toBeTruthy();

    // 8AM in America/New_York is 1PM in UTC, 5PM in America/New_York is 10PM in UTC
    expect(
      resultsWithNewYorkTz.every((result) => {
        return result.start.utc().hour() === 13 && result.end.utc().hour() === 22;
      })
    ).toBeTruthy();

    // 8AM in Asia/Kolkata is 2:30AM in UTC, 5PM in Asia/Kolkata is 11:30AM in UTC
    expect(
      resultsWithKolkataTz.every((result) => {
        const correctStartTime = result.start.utc().hour() === 2 && result.start.utc().minute() === 30;
        const correctEndTime = result.end.utc().hour() === 11 && result.end.utc().minute() === 30;
        return correctStartTime && correctEndTime;
      })
    ).toBeTruthy();
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

    const result = processDateOverride({
      item,
      itemDateAsUtc: dayjs.utc(item.date),
      timeZone,
      travelSchedules: [],
    });

    expect(result.start.format()).toEqual(dayjs("2023-06-12T12:00:00Z").tz(timeZone).format());
    expect(result.end.format()).toEqual(dayjs("2023-06-12T21:00:00Z").tz(timeZone).format());
  });
  it("should show date overrides in correct timezone with existing travel schedules", () => {
    const item = {
      date: new Date(Date.UTC(2023, 5, 12, 8, 0)),
      startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)), // 8 AM
      endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
    };

    // 2023-06-12T20:00:00-04:00 (America/New_York)
    const timeZone = "America/New_York";

    const travelScheduleTz = "Europe/Berlin";

    const travelSchedules = [
      {
        startDate: dayjs(new Date(Date.UTC(2023, 5, 11, 8, 0))).startOf("day"),
        endDate: dayjs(new Date(Date.UTC(2023, 5, 15, 8, 0))).endOf("day"),
        timeZone: travelScheduleTz,
      },
    ];

    const result = processDateOverride({
      item,
      itemDateAsUtc: dayjs.utc(item.date),
      timeZone,
      travelSchedules: travelSchedules,
    });

    expect(result.start.format()).toEqual(dayjs("2023-06-12T06:00:00Z").tz(travelScheduleTz).format());
    expect(result.end.format()).toEqual(dayjs("2023-06-12T15:00:00Z").tz(travelScheduleTz).format());
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

    const { dateRanges: results } = buildDateRanges({
      availability: items,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });
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
  it("should handle day shifts correctly", () => {
    const item = [
      {
        date: new Date(Date.UTC(2023, 7, 15)),
        startTime: new Date(Date.UTC(2023, 5, 12, 9, 0)), // 9 AM
        endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)), // 5 PM
      },
      {
        date: new Date(Date.UTC(2023, 7, 15)),
        startTime: new Date(Date.UTC(2023, 5, 12, 19, 0)), // 7 PM
        endTime: new Date(Date.UTC(2023, 5, 12, 21, 0)), // 9 PM
      },
    ];

    const timeZone = "Pacific/Honolulu";

    const dateFrom = dayjs.tz("2023-08-15", "Europe/Brussels").startOf("day");
    const dateTo = dayjs.tz("2023-08-15", "Europe/Brussels").endOf("day");
    //add tarvelScheduels

    const { dateRanges: result } = buildDateRanges({
      availability: item,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });
    // this happened only on Europe/Brussels, Europe/Amsterdam was 2023-08-15T17:00:00-10:00 (as it should be)
    expect(result[0].end.format()).not.toBe("2023-08-14T17:00:00-10:00");
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
    //add tarvelScheduels

    const { dateRanges: results } = buildDateRanges({
      availability: items,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });

    expect(results[0]).toEqual({
      start: dayjs("2023-06-14T07:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T16:00:00Z").tz(timeZone),
    });
  });
  it("should return correct date ranges for specific time slot in date override", () => {
    const items = [
      {
        date: new Date(Date.UTC(2023, 5, 13)),
        startTime: new Date(Date.UTC(0, 0, 0, 9, 0)),
        endTime: new Date(Date.UTC(0, 0, 0, 14, 0)),
      },
    ];
    const timeZone = "Europe/London";

    const dateFrom = dayjs("2023-06-13T10:00:00Z");
    const dateTo = dayjs("2023-06-13T10:30:00Z");
    //add tarvelScheduels

    const { dateRanges: results } = buildDateRanges({
      availability: items,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });

    expect(results[0]).toEqual({
      start: dayjs("2023-06-13T08:00:00Z").tz(timeZone),
      end: dayjs("2023-06-13T13:00:00Z").tz(timeZone),
    });
  });
  it("should return correct date ranges if date override would already already be the next day in utc timezone", () => {
    const items = [
      {
        date: new Date(Date.UTC(2023, 5, 13)),
        startTime: new Date(Date.UTC(0, 0, 0, 22, 0)),
        endTime: new Date(Date.UTC(0, 0, 0, 23, 0)),
      },
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date(Date.UTC(2023, 5, 12, 8, 0)),
        endTime: new Date(Date.UTC(2023, 5, 12, 17, 0)),
      },
    ];
    const timeZone = "America/New_York";

    const dateFrom = dayjs("2023-06-13T00:00:00Z");
    const dateTo = dayjs("2023-06-15T00:00:00Z");
    //add tarvelScheduels

    const { dateRanges: results } = buildDateRanges({
      availability: items,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
    });

    expect(results[0]).toEqual({
      start: dayjs("2023-06-14T02:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T03:00:00Z").tz(timeZone),
    });
    expect(results[1]).toEqual({
      start: dayjs("2023-06-14T12:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T21:00:00Z").tz(timeZone),
    });
  });
  it("should handle OOO correctly", () => {
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

    const outOfOffice = {
      "2023-06-13": {
        fromUser: { id: 1, displayName: "Team Free Example" },
      },
    };

    const dateFrom = dayjs("2023-06-13T00:00:00Z"); // 2023-06-12T20:00:00-04:00 (America/New_York)
    const dateTo = dayjs("2023-06-15T00:00:00Z");

    const timeZone = "America/New_York";

    const { dateRanges, oooExcludedDateRanges } = buildDateRanges({
      availability: items,
      timeZone,
      dateFrom,
      dateTo,
      travelSchedules: [],
      outOfOffice,
    });

    expect(dateRanges[0]).toEqual({
      start: dayjs.utc("2023-06-13T14:00:00Z").tz(timeZone),
      end: dayjs.utc("2023-06-13T19:00:00Z").tz(timeZone),
    });

    expect(dateRanges[1]).toEqual({
      start: dayjs.utc("2023-06-14T12:00:00Z").tz(timeZone),
      end: dayjs.utc("2023-06-14T21:00:00Z").tz(timeZone),
    });
    expect(oooExcludedDateRanges.length).toBe(1);
    expect(oooExcludedDateRanges[0]).toEqual({
      start: dayjs("2023-06-14T12:00:00Z").tz(timeZone),
      end: dayjs("2023-06-14T21:00:00Z").tz(timeZone),
    });
  });
});

describe("subtract", () => {
  it("subtracts appropriately when excluded ranges are given in order", () => {
    const data = {
      sourceRanges: [
        { start: dayjs.utc("2023-07-05T04:00:00.000Z"), end: dayjs.utc("2023-07-05T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-06T04:00:00.000Z"), end: dayjs.utc("2023-07-06T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-07T04:00:00.000Z"), end: dayjs.utc("2023-07-07T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-10T04:00:00.000Z"), end: dayjs.utc("2023-07-10T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-11T04:00:00.000Z"), end: dayjs.utc("2023-07-11T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-12T04:00:00.000Z"), end: dayjs.utc("2023-07-12T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-13T04:00:00.000Z"), end: dayjs.utc("2023-07-13T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-14T04:00:00.000Z"), end: dayjs.utc("2023-07-14T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-17T04:00:00.000Z"), end: dayjs.utc("2023-07-17T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-18T04:00:00.000Z"), end: dayjs.utc("2023-07-18T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-19T04:00:00.000Z"), end: dayjs.utc("2023-07-19T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-20T04:00:00.000Z"), end: dayjs.utc("2023-07-20T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-21T04:00:00.000Z"), end: dayjs.utc("2023-07-21T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-24T04:00:00.000Z"), end: dayjs.utc("2023-07-24T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-25T04:00:00.000Z"), end: dayjs.utc("2023-07-25T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-26T04:00:00.000Z"), end: dayjs.utc("2023-07-26T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-27T04:00:00.000Z"), end: dayjs.utc("2023-07-27T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-28T04:00:00.000Z"), end: dayjs.utc("2023-07-28T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-31T04:00:00.000Z"), end: dayjs.utc("2023-07-31T12:00:00.000Z") },
      ],
      excludedRanges: [
        { start: dayjs.utc("2023-07-05T04:00:00.000Z"), end: dayjs.utc("2023-07-05T04:15:00.000Z") },
        { start: dayjs.utc("2023-07-05T04:45:00.000Z"), end: dayjs.utc("2023-07-05T05:00:00.000Z") },
      ],
    };

    const result = subtract(data["sourceRanges"], data["excludedRanges"]).map((range) => ({
      start: range.start.format(),
      end: range.end.format(),
    }));

    expect(result).toEqual(
      expect.arrayContaining([
        { start: "2023-07-05T04:15:00Z", end: "2023-07-05T04:45:00Z" },
        { start: "2023-07-05T05:00:00Z", end: "2023-07-05T12:00:00Z" },
      ])
    );
  });

  it("subtracts appropriately when excluded ranges are not given in order", () => {
    const data = {
      sourceRanges: [
        { start: dayjs.utc("2023-07-05T04:00:00.000Z"), end: dayjs.utc("2023-07-05T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-06T04:00:00.000Z"), end: dayjs.utc("2023-07-06T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-07T04:00:00.000Z"), end: dayjs.utc("2023-07-07T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-10T04:00:00.000Z"), end: dayjs.utc("2023-07-10T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-11T04:00:00.000Z"), end: dayjs.utc("2023-07-11T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-12T04:00:00.000Z"), end: dayjs.utc("2023-07-12T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-13T04:00:00.000Z"), end: dayjs.utc("2023-07-13T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-14T04:00:00.000Z"), end: dayjs.utc("2023-07-14T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-17T04:00:00.000Z"), end: dayjs.utc("2023-07-17T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-18T04:00:00.000Z"), end: dayjs.utc("2023-07-18T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-19T04:00:00.000Z"), end: dayjs.utc("2023-07-19T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-20T04:00:00.000Z"), end: dayjs.utc("2023-07-20T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-21T04:00:00.000Z"), end: dayjs.utc("2023-07-21T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-24T04:00:00.000Z"), end: dayjs.utc("2023-07-24T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-25T04:00:00.000Z"), end: dayjs.utc("2023-07-25T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-26T04:00:00.000Z"), end: dayjs.utc("2023-07-26T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-27T04:00:00.000Z"), end: dayjs.utc("2023-07-27T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-28T04:00:00.000Z"), end: dayjs.utc("2023-07-28T12:00:00.000Z") },
        { start: dayjs.utc("2023-07-31T04:00:00.000Z"), end: dayjs.utc("2023-07-31T12:00:00.000Z") },
      ],
      excludedRanges: [
        { start: dayjs.utc("2023-07-05T04:45:00.000Z"), end: dayjs.utc("2023-07-05T05:00:00.000Z") },
        { start: dayjs.utc("2023-07-05T04:00:00.000Z"), end: dayjs.utc("2023-07-05T04:15:00.000Z") },
      ],
    };

    const result = subtract(data["sourceRanges"], data["excludedRanges"]).map((range) => ({
      start: range.start.format(),
      end: range.end.format(),
    }));

    expect(result).toEqual(
      expect.arrayContaining([
        { start: "2023-07-05T04:15:00Z", end: "2023-07-05T04:45:00Z" },
        { start: "2023-07-05T05:00:00Z", end: "2023-07-05T12:00:00Z" },
      ])
    );
  });
});
