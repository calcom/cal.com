import dayjs from "@calcom/dayjs";
import { getWorkingHours } from "@calcom/lib/availability";
import { beforeAll, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.setSystemTime(new Date("2021-06-20T11:59:59Z"));
});

it("correctly translates Availability (UTC+0) to UTC workingHours", async () => {
  expect(
    getWorkingHours({ timeZone: "GMT" }, [
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
    getWorkingHours({ timeZone: "Pacific/Auckland" }, [
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
    getWorkingHours({ timeZone: "Pacific/Midway" }, [
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 16, 0)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
    ])
  ).toStrictEqual([
    {
      days: [2],
      endTime: 659,
      startTime: 0,
    },
    {
      days: [1],
      endTime: 1439,
      startTime: 660,
    },
  ]);
});

it("can do the same with UTC offsets", async () => {
  // Take note that (Pacific/Midway) is UTC-12 on 2021-06-20, NOT +13 like the other half of the year.
  expect(
    getWorkingHours({ utcOffset: dayjs().tz("Pacific/Midway").utcOffset() }, [
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 16, 0)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
    ])
  ).toStrictEqual([
    {
      days: [2],
      endTime: 659,
      startTime: 0,
    },
    {
      days: [1],
      endTime: 1439,
      startTime: 660,
    },
  ]);
});

it("can also shift UTC into other timeZones", async () => {
  // UTC+0 time with 23:00 - 23:59 (Sunday) and 00:00 - 16:00 (Monday) when cast into UTC+1 should become 00:00 = 17:00 (Monday)
  expect(
    getWorkingHours({ utcOffset: -60 }, [
      {
        days: [0],
        startTime: new Date(Date.UTC(2021, 11, 16, 23)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 17, 0)),
        endTime: new Date(Date.UTC(2021, 11, 17, 16)),
      },
    ])
  ).toStrictEqual([
    // TODO: Maybe the desired result is 0-1020 as a single entry, but this requires some post-processing to merge. It may work as is so leaving this as now.
    {
      days: [1],
      endTime: 59,
      startTime: 0,
    },
    {
      days: [1],
      endTime: 1020,
      startTime: 60,
    },
  ]);
  // And the other way around; UTC+0 time with 00:00 - 1:00 (Monday) and 21:00 - 24:00 (Sunday) when cast into UTC-1 should become 20:00 = 24:00 (Sunday)
  expect(
    getWorkingHours({ utcOffset: 60 }, [
      {
        days: [0],
        startTime: new Date(Date.UTC(2021, 11, 16, 21)),
        endTime: new Date(Date.UTC(2021, 11, 16, 23, 59)),
      },
      {
        days: [1],
        startTime: new Date(Date.UTC(2021, 11, 17, 0)),
        endTime: new Date(Date.UTC(2021, 11, 17, 1)),
      },
    ])
  ).toStrictEqual([
    // TODO: Maybe the desired result is 1200-1439 as a single entry, but this requires some post-processing to merge. It may work as is so leaving this as now.
    {
      days: [0],
      endTime: 1379,
      startTime: 1200,
    },
    {
      days: [0],
      endTime: 1439,
      startTime: 1380,
    },
  ]);
});
