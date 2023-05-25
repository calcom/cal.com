import MockDate from "mockdate";
import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import { MINUTES_DAY_END, MINUTES_DAY_START } from "@calcom/lib/availability";

import getSlots from "./slots";

MockDate.set("2021-06-20T11:59:59Z");

const startTime = dayjs.utc().startOf("day");

// let dateRanges: DateRange[] = [];
// for (let date = startTime; date.isBefore(startTime.add(5, "day")); date = date.add(1, "day")) {
//   dateRanges.push({
//     start: date,
//     end: date.endOf("day"),
//   });
// }

const dateRangesMockDay = [{ start: dayjs.utc().startOf("day"), end: dayjs.utc().endOf("day") }];

const dateRangesNextDay = [
  { start: dayjs.utc().add(1, "day").startOf("day"), end: dayjs.utc().add(1, "day").endOf("day") },
];

describe("Tests the date-range slot logic", () => {
  it("can fit 24 hourly slots for an empty day", async () => {
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 60,
        minimumBookingNotice: 0,
        eventLength: 60,
        organizerTimeZone: "Etc/GMT",
        dateRanges: dateRangesNextDay,
      })
    ).toHaveLength(24);

    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 60,
        minimumBookingNotice: 0,
        eventLength: 60,
        organizerTimeZone: "America/Toronto",
        dateRanges: dateRangesNextDay,
      })
    ).toHaveLength(24);
  });

  it("only shows future booking slots on the same day", async () => {
    // The mock date is 1s to midday, so 12 slots should be open given 0 booking notice.

    expect(
      getSlots({
        inviteeDate: dayjs.utc(),
        frequency: 60,
        minimumBookingNotice: 0,
        dateRanges: dateRangesMockDay,
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(12);
  });

  it("adds minimum booking notice correctly", async () => {
    // 24h in a day.
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day").startOf("day"),
        frequency: 60,
        minimumBookingNotice: 1500,
        dateRanges: dateRangesNextDay,
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(11);
  });

  it("shows correct time slots for 20 minutes long events with working hours that do not end at a full hour ", async () => {
    // 72 20-minutes events in a 24h day
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 20,
        minimumBookingNotice: 0,
        dateRanges: dateRangesNextDay,
        eventLength: 20,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(72);
  });
});

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
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
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
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
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
            userId: 1,
            days: [0],
            startTime: 23 * 60, // 23h
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(0);
  });

  it("can cut off dates that due to invitee timezone differences fall on the previous day", async () => {
    const workingHours = [
      {
        userId: 1,
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
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
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
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 60,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(11);
  });

  it("shows correct time slots for 20 minutes long events with working hours that do not end at a full hour ", async () => {
    // 72 20-minutes events in a 24h day => so why should it only by 71? 2021-06-21T21:40:00.000Z is missing
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 20,
        minimumBookingNotice: 0,
        workingHours: [
          {
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END - 14, // 23:45
          },
        ],
        eventLength: 20,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(71);
  });

  it("can fit 48 25 minute slots with a 5 minute offset for an empty day", async () => {
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 25,
        minimumBookingNotice: 0,
        workingHours: [
          {
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: MINUTES_DAY_START,
            endTime: MINUTES_DAY_END,
          },
        ],
        eventLength: 25,
        offsetStart: 5,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(48);
  });
});
