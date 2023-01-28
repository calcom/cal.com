import { expect, it } from "@jest/globals";
import MockDate from "mockdate";

import dayjs from "@calcom/dayjs";
import getSlots, { getTimeSlotsCompact } from "@calcom/lib/slots";

import { MINUTES_DAY_END, MINUTES_DAY_START } from "@lib/availability";

MockDate.set("2021-06-20T11:59:59Z");

describe("Tests the slot logic", () => {
  it("can fit 24 hourly slots for an empty day", async () => {
    // 24h in a day.
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 60,
        minimumBookingNotice: 0,
        workingHours: [
          {
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      })
    ).toHaveLength(24);
  });

  // TODO: This test is sound; it should pass!
  it("only shows future booking slots on the same day", async () => {
    // The mock date is 1s to midday, so 12 slots should be open given 0 booking notice.
    expect(
      getSlots({
        inviteeDate: dayjs.utc(),
        frequency: 60,
        minimumBookingNotice: 0,
        workingHours: [
          {
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      })
    ).toHaveLength(12);
  });

  it("can cut off dates that due to invitee timezone differences fall on the next day", async () => {
    expect(
      getSlots({
        inviteeDate: dayjs().tz("Europe/Amsterdam").startOf("day"), // time translation +01:00
        frequency: 60,
        minimumBookingNotice: 0,
        workingHours: [
          {
            days: [0],
            startTime: 23 * 60, // 23h
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      })
    ).toHaveLength(0);
  });

  it("can cut off dates that due to invitee timezone differences fall on the previous day", async () => {
    const workingHours = [
      {
        days: [0],
        startTime: MINUTES_DAY_START,
        endTime: 1 * 60, // 1h
      },
    ];
    expect(
      getSlots({
        inviteeDate: dayjs().tz("Atlantic/Cape_Verde").startOf("day"), // time translation -01:00
        frequency: 60,
        minimumBookingNotice: 0,
        workingHours,
        eventLength: 60,
      })
    ).toHaveLength(0);
  });

  it("adds minimum booking notice correctly", async () => {
    // 24h in a day.
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day").startOf("day"),
        frequency: 60,
        minimumBookingNotice: 1500,
        workingHours: [
          {
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
      })
    ).toHaveLength(11);
  });
});

describe("Tests the compact slot logic", () => {
  it("should return an empty array if the slotDay is not in the days array", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [6, 7];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const busyTimes = [{ startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });

  it.each([
    {
      busyTimes: [
        { startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") },
        { startTime: dayjs("2022-02-01 14:00"), endTime: dayjs("2022-02-01 15:00") },
      ],
      freeSlots: [
        dayjs("2022-02-01 10:00"),
        dayjs("2022-02-01 10:30"),
        dayjs("2022-02-01 12:00"),
        dayjs("2022-02-01 12:30"),
        dayjs("2022-02-01 13:00"),
        dayjs("2022-02-01 13:30"),
        dayjs("2022-02-01 15:00"),
        dayjs("2022-02-01 15:30"),
        dayjs("2022-02-01 16:00"),
        dayjs("2022-02-01 16:30"),
      ],
    },
    {
      busyTimes: [
        { startTime: dayjs("2022-02-01 10:00"), endTime: dayjs("2022-02-01 16:00") },
        { startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") },
        { startTime: dayjs("2022-02-01 14:00"), endTime: dayjs("2022-02-01 15:00") },
      ],
      freeSlots: [dayjs("2022-02-01 16:00"), dayjs("2022-02-01 16:30")],
    },
  ])("should return time slots that are not blocked by busy times", ({ busyTimes, freeSlots }) => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [0, 1, 2, 3, 4, 5, 6];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual(freeSlots);
  });

  it("should return an empty array if all the slots are blocked by busy times", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [0, 1, 2, 3, 4, 5, 6];
    const minStartTime = dayjs("2022-02-01 10:00");
    const eventLength = 30;
    const busyTimes = [{ startTime: dayjs("2022-02-01 10:00"), endTime: dayjs("2022-02-01 17:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });

  it("should return an empty array if the eventLength is not matched with minStartTime", () => {
    const slotDay = dayjs("2022-02-01");
    const shiftStart = dayjs("2022-02-01 9:00");
    const shiftEnd = dayjs("2022-02-01 17:00");
    const days = [1, 2, 3, 4, 5];
    const minStartTime = dayjs("2022-02-01 17:35");
    const eventLength = 60;
    const busyTimes = [{ startTime: dayjs("2022-02-01 11:00"), endTime: dayjs("2022-02-01 12:00") }];
    const result = getTimeSlotsCompact({
      slotDay,
      shiftStart,
      shiftEnd,
      days,
      minStartTime,
      eventLength,
      busyTimes,
    });
    expect(result).toEqual([]);
  });
});
