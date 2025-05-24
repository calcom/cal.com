import { describe, expect, it, beforeAll, vi } from "vitest";

import dayjs from "@calcom/dayjs";

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

describe("Tests the slot logic", () => {
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
      eventLength: 20,
      offsetStart: 0,
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

describe("Tests the slot logic with custom env variable", () => {
  beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL", "10");
  });

  it("test using a 10 minute interval", async () => {
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

describe("Tests the slots function performance", () => {
  it("handles hundreds of date ranges efficiently", async () => {
    const startTime = process.hrtime();

    const startDay = dayjs.utc().add(1, "day").startOf("day");
    const dateRanges: DateRange[] = [];

    for (let day = 0; day < 7; day++) {
      const currentDay = startDay.add(day, "day");

      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          if (dateRanges.length >= 2000) break;

          dateRanges.push({
            start: currentDay.hour(hour).minute(minute),
            end: currentDay
              .hour(hour)
              .minute(minute + 4)
              .second(59),
          });
        }
        if (dateRanges.length >= 2000) break;
      }
      if (dateRanges.length >= 2000) break;
    }

    const result = getSlots({
      inviteeDate: startDay,
      frequency: 5,
      minimumBookingNotice: 0,
      dateRanges: dateRanges,
      eventLength: 5,
      offsetStart: 0,
    });

    expect(result.length).toBeGreaterThan(0);

    const endTime = process.hrtime(startTime);
    const executionTimeInMs = endTime[0] * 1000 + endTime[1] / 1000000;

    expect(executionTimeInMs).toBeLessThan(3000); // less than 3 seconds for 2000 date ranges

    console.log(
      `Performance test completed in ${executionTimeInMs}ms with ${result.length} slots generated from ${dateRanges.length} date ranges`
    );
  });
});
