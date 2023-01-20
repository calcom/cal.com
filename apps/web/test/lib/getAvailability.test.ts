import { expect, it } from "@jest/globals";
import MockDate from "mockdate";

import dayjs from "@calcom/dayjs";
import getAvailability from "@calcom/lib/server/getAvailability";

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
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-21T23:59:59Z"),
      })
    ).toStrictEqual([
      [
        {
          end: dayjs("2021-06-21T16:00:00.000Z").tz("Europe/London"),
          start: dayjs("2021-06-21T08:00:00.000Z").tz("Europe/London"),
        },
      ],
    ]);
  });

  it("can apply date overrides", () => {
    expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [
          {
            days: [1],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
          },
          {
            date: new Date("2021-06-21T00:00:00Z"),
            startTime: new Date("1970-01-01T12:00:00Z"),
            endTime: new Date("1970-01-01T15:00:00Z"),
          },
        ],
        dateFrom: new Date("2021-06-21T00:00:00Z"),
        dateTo: new Date("2021-06-21T23:59:59Z"),
      })
    ).toStrictEqual([
      [
        {
          end: dayjs("2021-06-21T14:00:00.000Z").tz("Europe/London"),
          start: dayjs("2021-06-21T11:00:00.000Z").tz("Europe/London"),
        },
      ],
    ]);
  });

  it("will exclude past times from availability", () => {
    /*expect(
      getAvailability({
        timeZone: "Europe/London",
        availability: [],
        dateFrom: "2021-06-20T11:59:59Z",
        dateTo: "2021-06-20T11:59:59Z",
      })
    );*/
  });
});
