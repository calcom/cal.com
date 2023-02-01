import { expect, it } from "@jest/globals";
import MockDate from "mockdate";

import dayjs from "@calcom/dayjs";
import getAvailability from "@calcom/lib/server/getAvailability";

// Note the 20th of June is in DST
MockDate.set("2021-06-20T11:59:59Z");

describe("Tests getAvailability", () => {
  it("can normalize empty availability", () => {
    expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-21T23:59:59Z"),
      })
    ).toStrictEqual([]);
  });

  it("can normalize working hours", () => {
    expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            date: null,
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-21T23:59:59Z"),
      })
    ).toStrictEqual([
      {
        end: dayjs("2021-06-21T16:00:00.000Z").tz("Europe/London"),
        start: dayjs("2021-06-21T08:00:00.000Z").tz("Europe/London"),
      },
    ]);
  });

  it("can override with date override", () => {
    expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            date: null,
          },
          {
            date: new Date("2021-06-21T00:00:00Z"),
            startTime: new Date("1970-01-01T12:00:00Z"),
            endTime: new Date("1970-01-01T15:00:00Z"),
            days: [],
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-21T23:59:59Z"),
      })
    ).toStrictEqual([
      {
        end: dayjs("2021-06-21T14:00:00.000Z").tz("Europe/London"),
        start: dayjs("2021-06-21T11:00:00.000Z").tz("Europe/London"),
      },
    ]);
  });

  it("can add an additional day with date override", () => {
    expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            date: null,
          },
          {
            date: new Date("2021-06-22T00:00:00Z"),
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            days: [],
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-25T23:59:59Z"),
      })
    ).toStrictEqual([
      {
        end: dayjs("2021-06-21T16:00:00.000Z").tz("Europe/London"),
        start: dayjs("2021-06-21T08:00:00.000Z").tz("Europe/London"),
      },
      {
        end: dayjs("2021-06-22T16:00:00.000Z").tz("Europe/London"),
        start: dayjs("2021-06-22T08:00:00.000Z").tz("Europe/London"),
      },
    ]);
  });

  it("can merge consecutive date blocks", () => {
    expect(
      getAvailability({
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T22:00:00Z"),
            endTime: new Date("1970-01-01T23:59:59Z"),
            date: null,
          },
          {
            date: null,
            startTime: new Date("1970-01-01T00:00:00Z"),
            endTime: new Date("1970-01-01T01:00:00Z"),
            days: [2],
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-25T23:59:59Z"),
      })
    ).toStrictEqual([
      {
        start: dayjs.utc("2021-06-21T22:00:00.000Z"),
        end: dayjs.utc("2021-06-22T01:00:00.000Z"),
      },
    ]);
  });

  it("can merge consecutive date blocks with date overrides", () => {
    expect(
      getAvailability({
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T22:00:00Z"),
            endTime: new Date("1970-01-01T23:59:59Z"),
            date: null,
          },
          {
            date: new Date("2021-06-22T00:00:00.000Z"),
            startTime: new Date("1970-01-01T00:00:00Z"),
            endTime: new Date("1970-01-01T01:00:00Z"),
            days: [],
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-25T23:59:59Z"),
      })
    ).toStrictEqual([
      {
        start: dayjs.utc("2021-06-21T22:00:00.000Z"),
        end: dayjs.utc("2021-06-22T01:00:00.000Z"),
      },
    ]);
  });

  it("it can also get availability of standard times", () => {
    expect(
      getAvailability({
        timeZone: "Asia/Jakarta", // UTC+7
        availability: [
          {
            date: new Date("2021-01-31T00:00:00.000Z"),
            startTime: new Date("1970-01-01T00:00:00Z"),
            endTime: new Date("1970-01-01T01:00:00Z"),
            days: [],
          },
        ],
        // UTC
        dateFrom: new Date("2021-01-31T00:00:00Z"),
        dateTo: new Date("2021-01-31T23:59:59Z"),
      })
    ).toStrictEqual([]);
  });

  it("will translate a week correctly", () => {
    expect(
      getAvailability({
        timeZone: "Asia/Jakarta", // UTC+7
        availability: [
          {
            date: null,
            startTime: new Date("1970-01-01T04:00:00Z"), // 21+7
            endTime: new Date("1970-01-01T06:00:00Z"), // 23+7
            days: [0, 1, 2, 3, 4, 5], // Mon-Fri
          },
        ],
        // UTC
        dateFrom: new Date("2021-01-30T00:00:00Z"),
        dateTo: new Date("2021-02-03T23:59:59Z"),
      }).map((range) => ({
        start: range.start.utc(),
        end: range.end.utc(),
      }))
    ).toStrictEqual([
      {
        end: dayjs.utc("2021-01-30T23:00:00.000Z"),
        start: dayjs.utc("2021-01-30T21:00:00.000Z"),
      },
      {
        end: dayjs.utc("2021-01-31T23:00:00.000Z"),
        start: dayjs.utc("2021-01-31T21:00:00.000Z"),
      },
      {
        end: dayjs.utc("2021-02-01T23:00:00.000Z"),
        start: dayjs.utc("2021-02-01T21:00:00.000Z"),
      },
      {
        end: dayjs.utc("2021-02-02T23:00:00.000Z"),
        start: dayjs.utc("2021-02-02T21:00:00.000Z"),
      },
    ]);
  });
});
