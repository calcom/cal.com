import { describe, expect, it, beforeAll, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { MINUTES_DAY_END, MINUTES_DAY_START } from "@calcom/lib/availability";

import type { DateRange } from "./date-ranges";
import getSlots from "./slots";

let dateRangesNextDay: DateRange[];

let dateRangesMockDay: DateRange[];

beforeAll(() => {
  vi.setSystemTime(dayjs.utc("2021-06-20T11:59:59Z").toDate());

  dateRangesMockDay = [{ start: dayjs.utc().startOf("day"), end: dayjs.utc().endOf("day") }];

  dateRangesNextDay = [
    {
      start: dayjs.utc().add(1, "day").startOf("day"),
      end: dayjs.utc().add(1, "day").endOf("day"),
    },
  ];
});

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
    const result = getSlots({
      inviteeDate: dayjs().add(1, "day"),
      frequency: 20,
      minimumBookingNotice: 0,
      dateRanges: dateRangesNextDay,
      eventLength: 20,
      offsetStart: 0,
      organizerTimeZone: "America/Toronto",
    });
    expect(result).toHaveLength(72);
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

  it("shows correct time slots for 20 minutes long events with working hours that do not end at a full hour", async () => {
    const result = getSlots({
      inviteeDate: dayjs().add(1, "day"),
      frequency: 20,
      minimumBookingNotice: 0,
      dateRanges: [{ start: dayjs("2021-06-21T00:00:00.000Z"), end: dayjs("2021-06-21T23:45:00.000Z") }],
      /*workingHours: [
        {
          userId: 1,
          days: Array.from(Array(7).keys()),
          startTime: MINUTES_DAY_START,
          endTime: MINUTES_DAY_END - 14, // 23:45
        },
      ],*/
      eventLength: 20,
      offsetStart: 0,
      organizerTimeZone: "America/Toronto",
    });

    // 71 20-minutes events in a 24h - 15m day
    expect(result).toHaveLength(71);
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

  it("tests the final slot of the day is included", async () => {
    const slots = getSlots({
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000+02:00", "Europe/Brussels"),
      eventLength: 15,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480,
          endTime: 960,
          userId: 9,
        },
        {
          days: [4],
          startTime: 1170,
          endTime: 1379,
          userId: 9,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      dateRanges: [
        { start: dayjs("2023-07-13T07:00:00.000Z"), end: dayjs("2023-07-13T15:00:00.000Z") },
        { start: dayjs("2023-07-13T18:30:00.000Z"), end: dayjs("2023-07-13T20:59:59.000Z") },
      ],
      minimumBookingNotice: 120,
      frequency: 15,
      organizerTimeZone: "Europe/London",
    }).reverse();

    expect(slots[0].time.format()).toBe("2023-07-13T22:45:00+02:00");
  });

  it("tests slots for half hour timezones", async () => {
    const slots = getSlots({
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000+05:30", "Asia/Kolkata"),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
      organizerTimeZone: "Asia/Kolkata",
      dateRanges: [
        {
          start: dayjs.tz("2023-07-13T07:30:00.000", "Asia/Kolkata"),
          end: dayjs.tz("2023-07-13T09:30:00.000", "Asia/Kolkata"),
        },
      ],
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].time.format()).toBe("2023-07-13T08:00:00+05:30");
  });
});

describe("Tests the date-range slot logic with custom env variable", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL", "10");
  });

  it("can fit 11 10 minute slots within a 2 hour window using a 10 mintue availabilty option with a starting time of 10 past the hour", async () => {
    expect(Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL)).toBe(10);
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 10,
        minimumBookingNotice: 0,
        workingHours: [
          {
            userId: 1,
            days: Array.from(Array(7).keys()),
            startTime: 10,
            endTime: 120,
          },
        ],
        eventLength: 10,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
      })
    ).toHaveLength(11);
  });

  it("test buildSlotsWithDateRanges using a 10 mintue interval", async () => {
    expect(Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL)).toBe(10);
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 10,
        minimumBookingNotice: 0,
        eventLength: 10,
        offsetStart: 0,
        organizerTimeZone: "America/Toronto",
        dateRanges: [{ start: dayjs("2023-07-13T00:10:00.000Z"), end: dayjs("2023-07-13T02:00:00.000Z") }],
      })
    ).toHaveLength(11);
  });
});
