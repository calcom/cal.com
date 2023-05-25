import type { Availability } from "@prisma/client";
import MockDate from "mockdate";
import { expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import { getAvailabilityFromSchedule } from "@calcom/lib/availability";

MockDate.set("2021-06-20T11:59:59Z");

//parse "hh:mm-hh:mm" into <Availability> object
const parseWorkingHours = (workingHours: string) => {
  const times = workingHours.split("-").map((time) => dayjs(time, "hh:mm").toDate());
  return { start: times[0], end: times[1] };
};
const p = parseWorkingHours;

// mocked working hours
const fulltimeWH = p("09:00-17:00");
const morningWH = p("09:00-12:00");
const afternoonWH = p("13:00-17:00");

it("should return an empty availability array when received an empty schedule", async () => {
  const schedule = [[]];
  expect(getAvailabilityFromSchedule(schedule)).toStrictEqual([]);
});

it("should return availability for all workable days from 9:00 to 17:00", async () => {
  const schedule = [[], [fulltimeWH], [fulltimeWH], [fulltimeWH], [fulltimeWH], [fulltimeWH], []];
  const expected = [
    {
      days: [1, 2, 3, 4, 5],
      startTime: fulltimeWH.start,
      endTime: fulltimeWH.end,
    },
  ] as Availability[];

  expect(getAvailabilityFromSchedule(schedule)).toStrictEqual(expected);
});

it("should return the available days grouped by the available time slots", async () => {
  const schedule = [
    [],
    [afternoonWH],
    [afternoonWH],
    [morningWH, afternoonWH],
    [fulltimeWH],
    [morningWH],
    [],
  ];
  const expected = [
    {
      days: [1, 2, 3],
      startTime: afternoonWH.start,
      endTime: afternoonWH.end,
    },
    {
      days: [3, 5],
      startTime: morningWH.start,
      endTime: morningWH.end,
    },

    {
      days: [4],
      startTime: fulltimeWH.start,
      endTime: fulltimeWH.end,
    },
  ] as Availability[];

  expect(getAvailabilityFromSchedule(schedule)).toStrictEqual(expected);
});
