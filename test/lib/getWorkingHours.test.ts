import { expect, it } from "@jest/globals";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import MockDate from "mockdate";

import { getWorkingHours } from "@lib/availability";

dayjs.extend(utc);
dayjs.extend(timezone);

MockDate.set("2021-06-20T11:59:59Z");

it("correctly translates Availability (UTC+0) to UTC workingHours", async () => {
  expect(
    getWorkingHours("GMT", [
      {
        days: [0],
        startTime: new Date(Date.UTC(2021, 11, 16, 23)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
    ])
  ).toStrictEqual([
    {
      days: [0],
      endTime: 1439,
      startTime: 1380,
    },
  ]);
});

it("correctly translates Availability in a positive UTC offset (Pacific/Auckland) to UTC workingHours", async () => {
  // Take note that (Pacific/Auckland) is UTC+12 on 2021-06-20, NOT +13 like the other half of the year.
  expect(
    getWorkingHours("Pacific/Auckland", [
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 16, 0)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
    ])
  ).toStrictEqual([
    {
      days: [1],
      endTime: 719,
      startTime: 0,
    },
    {
      days: [0],
      endTime: 1439,
      startTime: 720, // 0 (midnight) - 12 * 60 (DST)
    },
  ]);
});

it("correctly translates Availability in a negative UTC offset (Pacific/Midway) to UTC workingHours", async () => {
  // Take note that (Pacific/Midway) is UTC-12 on 2021-06-20, NOT +13 like the other half of the year.
  expect(
    getWorkingHours("Pacific/Midway", [
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 16, 0)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
    ])
  ).toStrictEqual([
    {
      days: [2],
      endTime: 660,
      startTime: 0,
    },
    {
      days: [1],
      endTime: 1439,
      startTime: 660,
    },
  ]);
});
