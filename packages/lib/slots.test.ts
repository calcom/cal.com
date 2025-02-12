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
        dateRanges: dateRangesNextDay,
      })
    ).toHaveLength(24);
  });

  it("can fit 24 hourly slots for an empty day with interval != eventLength", async () => {
    expect(
      getSlots({
        inviteeDate: dayjs.utc().add(1, "day"),
        frequency: 60,
        minimumBookingNotice: 0,
        eventLength: 30,
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
    });
    expect(result).toHaveLength(72);
  });

  it("can create multiple time slot groups when multiple date ranges are given", async () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges = [
      // 11:00-11:20,11:20-11:40,11:40-12:00
      {
        start: nextDay.hour(11),
        end: nextDay.hour(12),
      },
      // 14:00-14:20,14:20-14:40,14:40-15:00
      {
        start: nextDay.hour(14),
        end: nextDay.hour(15),
      },
    ];
    const result = getSlots({
      inviteeDate: nextDay,
      frequency: 20,
      minimumBookingNotice: 0,
      dateRanges: dateRanges,
      eventLength: 20,
      offsetStart: 0,
    });

    expect(result).toHaveLength(6);
  });

  it("can merge multiple time slot groups when multiple date ranges are given that overlap", async () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges = [
      // 11:00-11:20,11:20-11:40,11:40-12:00
      {
        start: nextDay.hour(11),
        end: nextDay.hour(12),
      },
      // 12:00-12:20,12:20-12:40
      {
        start: nextDay.hour(11).minute(20),
        end: nextDay.hour(12).minute(40),
      },
    ];
    const result = getSlots({
      inviteeDate: nextDay,
      frequency: 20,
      minimumBookingNotice: 0,
      dateRanges: dateRanges,
      eventLength: 20,
      offsetStart: 0,
    });

    expect(result).toHaveLength(5);
  });

  // for now, stay consistent with current behaviour and enable the slot 11:00, 11:45
  // however, optimal slot allocation is 11:15-12:00,12:00-12:45 (as both hosts can be routed to at this time)
  it("finds correct slots when two unequal date ranges are given", async () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges = [
      // 11:00-13:00
      {
        start: nextDay.hour(11),
        end: nextDay.hour(13),
      },
      // 11:15-13:00
      {
        start: nextDay.hour(11).minute(15),
        end: nextDay.hour(13),
      },
    ];
    const result = getSlots({
      inviteeDate: nextDay,
      frequency: 45,
      minimumBookingNotice: 0,
      dateRanges: dateRanges,
      eventLength: 45,
      offsetStart: 0,
    });

    expect(result).toHaveLength(2);
  });
  it("finds correct slots when two unequal date ranges are given (inverse)", async () => {
    const nextDay = dayjs.utc().add(1, "day").startOf("day");

    const dateRangesInverseOrder = [
      // 11:15-13:00
      {
        start: nextDay.hour(11).minute(15),
        end: nextDay.hour(13),
      },
      // 11:00-13:00
      {
        start: nextDay.hour(11),
        end: nextDay.hour(13),
      },
    ];

    const resultInverseOrder = getSlots({
      inviteeDate: nextDay,
      frequency: 45,
      minimumBookingNotice: 0,
      dateRanges: dateRangesInverseOrder,
      eventLength: 45,
      offsetStart: 0,
    });

    expect(resultInverseOrder).toHaveLength(2);
  });

  it("finds correct slots over the span of multiple days", async () => {
    const inviteeDate = dayjs.utc().add(1, "day").startOf("day");

    const dateRanges = [
      // 11:30-14:00
      {
        start: inviteeDate.hour(11).minute(30),
        end: inviteeDate.hour(14),
      },
      // 9:15-13:00
      {
        start: inviteeDate.hour(9).minute(15),
        end: inviteeDate.hour(11),
      },
      // 11:30-14:00
      {
        start: inviteeDate.add(1, "day").hour(11).minute(30),
        end: inviteeDate.add(1, "day").hour(14),
      },
      // 11:15-13:00
      {
        start: inviteeDate.add(1, "day").hour(9).minute(15),
        end: inviteeDate.add(1, "day").hour(11),
      },
    ];

    // each day availability should go 10:00, 12:00, 13:00

    const result = getSlots({
      // right now from the perspective of invitee local time.
      inviteeDate,
      frequency: 60,
      minimumBookingNotice: 0,
      dateRanges: dateRanges,
      eventLength: 60,
      offsetStart: 0,
    });

    expect(result).toHaveLength(6);
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

  it("tests the final slot of the day is included", async () => {
    const slots = getSlots({
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000", "Europe/Brussels"),
      eventLength: 15,
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
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000", "Asia/Kolkata"),
      frequency: 60,
      minimumBookingNotice: 0,
      eventLength: 60,
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

  it("tests slots for 5 minute events", async () => {
    const slots = getSlots({
      inviteeDate: dayjs.tz("2023-07-13T00:00:00.000+05:30", "Europe/London"),
      frequency: 5,
      minimumBookingNotice: 0,
      eventLength: 5,
      dateRanges: [
        // fits 1 slot
        {
          start: dayjs.tz("2023-07-13T07:00:00.000", "Europe/London"),
          end: dayjs.tz("2023-07-13T07:05:00.000", "Europe/London"),
        },
        // fits 4 slots
        {
          start: dayjs.tz("2023-07-13T07:10:00.000", "Europe/London"),
          end: dayjs.tz("2023-07-13T07:30:00.000", "Europe/London"),
        },
      ],
    });

    expect(slots).toHaveLength(5);
  });

  it("tests slots for events with an event length that is not divisible by 5", async () => {
    const slots = getSlots({
      inviteeDate: dayjs.utc().startOf("day"),
      frequency: 8,
      minimumBookingNotice: 0,
      eventLength: 8,
      dateRanges: [
        {
          start: dayjs.utc("2023-07-13T07:22:00.000"),
          end: dayjs.utc("2023-07-13T08:00:00.000"),
        },
      ],
    });
    /*
     * 2023-07-13T07:22:00.000Z
     * 2023-07-13T07:30:00.000Z
     * 2023-07-13T07:38:00.000Z
     * 2023-07-13T07:46:00.000Z
     */
    expect(slots).toHaveLength(4);
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
        dateRanges: [{ start: dayjs("2023-07-13T00:10:00.000Z"), end: dayjs("2023-07-13T02:00:00.000Z") }],
      })
    ).toHaveLength(11);
  });
});

describe("Tests the date-range slot logic with showOptimizedSlots", () => {
  it("should respect start of the hour for 60minutes slots for availabilities like 09:30-17:00, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 540, //09:00
          endTime: 1020, //17:00
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:09:30, end:17:00
      // with 09:00 - 09:30 busy time
      dateRanges: [{ start: dayjs("2024-09-12T16:30:00.000Z"), end: dayjs("2024-09-13T00:00:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T10:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T12:00:00-07:00",
      "2024-09-12T13:00:00-07:00",
      "2024-09-12T14:00:00-07:00",
      "2024-09-12T15:00:00-07:00",
      "2024-09-12T16:00:00-07:00",
    ]);
  });

  it("shows 4 60minutes slots for availability like 08:00-12:30 with 10:00-10:10 busytime, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 750, //12:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:30
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:30:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T10:15:00-07:00",
      "2024-09-12T11:15:00-07:00",
    ]);
  });

  it("shows 3 60minutes slots for availability like 08:00-12:30 with 10:00-10:10 busytime, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 750, //12:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:30
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:30:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
    ]);
  });

  it("shows 3 60minutes slots for availability like 08:00-12:00 with 10:00-10:10 busytime, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 720, //12:00
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:00
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:00:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
    ]);
  });

  it("shows 3 60minutes slots for availability like 08:00-12:00 with 10:00-10:10 busytime, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 720, //12:00
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:00
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:00:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
    ]);
  });

  it("shows 9 30minutes slots for availability like 08:00-12:45 with 10:00-10:10 busytime, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 30,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 765, //12:45
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:45
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:45:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 30,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T08:30:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T09:30:00-07:00",
      "2024-09-12T10:15:00-07:00",
      "2024-09-12T10:45:00-07:00",
      "2024-09-12T11:15:00-07:00",
      "2024-09-12T11:45:00-07:00",
      "2024-09-12T12:15:00-07:00",
    ]);
  });

  it("shows 8 30minutes slots for availability like 08:00-12:45 with 10:00-10:10 busytime, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 30,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 765, //12:45
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:45
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:45:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 30,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T08:30:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T09:30:00-07:00",
      "2024-09-12T10:30:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T11:30:00-07:00",
      "2024-09-12T12:00:00-07:00",
    ]);
  });

  it("shows 13 20minutes slots for availability like 08:00-12:30 with 10:00-10:10 busytime, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 20,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 750, //12:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:30
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:30:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 20,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(13);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T08:20:00-07:00",
      "2024-09-12T08:40:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T09:20:00-07:00",
      "2024-09-12T09:40:00-07:00",
      "2024-09-12T10:10:00-07:00",
      "2024-09-12T10:30:00-07:00",
      "2024-09-12T10:50:00-07:00",
      "2024-09-12T11:10:00-07:00",
      "2024-09-12T11:30:00-07:00",
      "2024-09-12T11:50:00-07:00",
      "2024-09-12T12:10:00-07:00",
    ]);
  });

  it("shows 12 20minutes slots for availability like 08:00-12:30 with 10:00-10:10 busytime, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 20,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 480, //08:00
          endTime: 750, //12:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:08:00, end:10:00
      // start:10:10, end:12:30
      // with 10:00 - 10:10 busy time
      dateRanges: [
        { start: dayjs("2024-09-12T15:00:00.000Z"), end: dayjs("2024-09-12T17:00:00.000Z") },
        { start: dayjs("2024-09-12T17:10:00.000Z"), end: dayjs("2024-09-12T19:30:00.000Z") },
      ],
      minimumBookingNotice: 0,
      frequency: 20,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(12);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T08:20:00-07:00",
      "2024-09-12T08:40:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T09:20:00-07:00",
      "2024-09-12T09:40:00-07:00",
      "2024-09-12T10:20:00-07:00",
      "2024-09-12T10:40:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T11:20:00-07:00",
      "2024-09-12T11:40:00-07:00",
      "2024-09-12T12:00:00-07:00",
    ]);
  });

  it("shows 8 60minutes slots for availability like 09:30-17:30, when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 570, //09:30
          endTime: 1050, //17:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:09:30, end:17:30
      dateRanges: [{ start: dayjs("2024-09-12T16:30:00.000Z"), end: dayjs("2024-09-13T00:30:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(8);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T09:30:00-07:00",
      "2024-09-12T10:30:00-07:00",
      "2024-09-12T11:30:00-07:00",
      "2024-09-12T12:30:00-07:00",
      "2024-09-12T13:30:00-07:00",
      "2024-09-12T14:30:00-07:00",
      "2024-09-12T15:30:00-07:00",
      "2024-09-12T16:30:00-07:00",
    ]);
  });

  it("shows 7 60minutes slots for availability like 09:30-17:30, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 570, //09:30
          endTime: 1050, //17:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:09:30, end:17:30
      dateRanges: [{ start: dayjs("2024-09-12T16:30:00.000Z"), end: dayjs("2024-09-13T00:30:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(7);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T10:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T12:00:00-07:00",
      "2024-09-12T13:00:00-07:00",
      "2024-09-12T14:00:00-07:00",
      "2024-09-12T15:00:00-07:00",
      "2024-09-12T16:00:00-07:00",
    ]);
  });

  it("should respect start of the hour for 60minutes slots for availabilities like 07:45-15:30, even when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 565, //07:45
          endTime: 930, //15:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:07:45, end:15:30
      dateRanges: [{ start: dayjs("2024-09-12T14:45:00.000Z"), end: dayjs("2024-09-12T22:30:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(7);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T10:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T12:00:00-07:00",
      "2024-09-12T13:00:00-07:00",
      "2024-09-12T14:00:00-07:00",
    ]);
  });

  it("should respect start of the hour for 60minutes slots for availabilities like 07:45-15:30, when showOptimizedSlots set to false", async () => {
    const slots = getSlots({
      showOptimizedSlots: false,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 565, //07:45
          endTime: 930, //15:30
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:07:45, end:15:30
      dateRanges: [{ start: dayjs("2024-09-12T14:45:00.000Z"), end: dayjs("2024-09-12T22:30:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(7);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T08:00:00-07:00",
      "2024-09-12T09:00:00-07:00",
      "2024-09-12T10:00:00-07:00",
      "2024-09-12T11:00:00-07:00",
      "2024-09-12T12:00:00-07:00",
      "2024-09-12T13:00:00-07:00",
      "2024-09-12T14:00:00-07:00",
    ]);
  });

  it("should respect start of the hour for 60minutes slots for availabilities like 09:05-12:55, even when showOptimizedSlots set to true", async () => {
    const slots = getSlots({
      showOptimizedSlots: true,
      inviteeDate: dayjs.tz("2024-09-12T00:00:00.000-07:00", "America/Los_Angeles"),
      eventLength: 60,
      workingHours: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: 545, //09:05
          endTime: 775, //12:55
          userId: 1,
        },
      ],
      dateOverrides: [],
      offsetStart: 0,
      // equivalent dateRanges in UTC-7
      // start:09:05, end:12:55
      dateRanges: [{ start: dayjs("2024-09-12T16:05:00.000Z"), end: dayjs("2024-09-12T19:55:00.000Z") }],
      minimumBookingNotice: 0,
      frequency: 60,
      organizerTimeZone: "Europe/London",
    });

    expect(slots.length).toStrictEqual(3);
    expect(slots.map((slot) => slot.time.format())).toStrictEqual([
      "2024-09-12T09:15:00-07:00",
      "2024-09-12T10:15:00-07:00",
      "2024-09-12T11:15:00-07:00",
    ]);
  });
});
