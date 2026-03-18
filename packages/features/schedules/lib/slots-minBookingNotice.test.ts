import dayjs from "@calcom/dayjs";
import { isTimeOutOfBounds, BookingDateInPastError } from "@calcom/lib/isOutOfBounds";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import getSlots from "./slots";

/**
 * Proves that `buildSlotsWithDateRanges` already enforces the minimumBookingNotice
 * constraint at generation time, making the downstream `isTimeOutOfBounds` filter
 * in `_mapWithinBoundsSlotsToDate` redundant.
 *
 * See the TODO at util.ts:1602:
 * "Slots calculation logic already seems to consider the minimum booking notice
 *  and past booking time and thus there shouldn't be need to filter out slots here."
 */
describe("getSlots never produces slots that isTimeOutOfBounds would reject", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const scenarios = [
    {
      name: "0 min notice, same-day range",
      minimumBookingNotice: 0,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-15T00:00:00Z"),
          end: dayjs.utc("2099-06-15T23:59:59Z"),
        },
      ],
    },
    {
      name: "30 min notice, same-day range",
      minimumBookingNotice: 30,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-15T00:00:00Z"),
          end: dayjs.utc("2099-06-15T23:59:59Z"),
        },
      ],
    },
    {
      name: "120 min notice, same-day range",
      minimumBookingNotice: 120,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-15T00:00:00Z"),
          end: dayjs.utc("2099-06-15T23:59:59Z"),
        },
      ],
    },
    {
      name: "600 min notice (10 hours), same-day range",
      minimumBookingNotice: 600,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-15T00:00:00Z"),
          end: dayjs.utc("2099-06-15T23:59:59Z"),
        },
      ],
    },
    {
      name: "60 min notice, next-day range",
      minimumBookingNotice: 60,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-16T00:00:00Z"),
          end: dayjs.utc("2099-06-16T23:59:59Z"),
        },
      ],
    },
    {
      name: "1440 min notice (24h), multi-day range",
      minimumBookingNotice: 1440,
      dateRanges: () => [
        {
          start: dayjs.utc("2099-06-15T00:00:00Z"),
          end: dayjs.utc("2099-06-17T23:59:59Z"),
        },
      ],
    },
  ];

  scenarios.forEach(({ name, minimumBookingNotice, dateRanges }) => {
    it(`${name}: every generated slot passes isTimeOutOfBounds`, () => {
      const slots = getSlots({
        inviteeDate: dayjs.utc("2099-06-15T12:00:00Z"),
        frequency: 60,
        minimumBookingNotice,
        eventLength: 60,
        dateRanges: dateRanges(),
      });

      for (const slot of slots) {
        let outOfBounds = false;
        try {
          outOfBounds = isTimeOutOfBounds({
            time: slot.time.toISOString(),
            minimumBookingNotice,
          });
        } catch (error) {
          if (error instanceof BookingDateInPastError) {
            throw new Error(
              `Slot at ${slot.time.toISOString()} was flagged as "in the past" by isTimeOutOfBounds, ` +
                `but getSlots should never produce past slots. minimumBookingNotice=${minimumBookingNotice}`
            );
          }
          throw error;
        }

        expect(
          outOfBounds,
          `Slot at ${slot.time.toISOString()} was rejected by isTimeOutOfBounds ` +
            `(minimumBookingNotice=${minimumBookingNotice}), but getSlots should ` +
            `have already excluded it at generation time`
        ).toBe(false);
      }
    });
  });

  it("15 min slots with 45 min notice: no slot violates the notice window", () => {
    const minimumBookingNotice = 45;
    const slots = getSlots({
      inviteeDate: dayjs.utc("2099-06-15T12:00:00Z"),
      frequency: 15,
      minimumBookingNotice,
      eventLength: 30,
      dateRanges: [
        {
          start: dayjs.utc("2099-06-15T12:00:00Z"),
          end: dayjs.utc("2099-06-15T15:00:00Z"),
        },
      ],
    });

    expect(slots.length).toBeGreaterThan(0);

    const earliestSlot = slots[0]!;
    const noticeThreshold = dayjs.utc().add(minimumBookingNotice, "minutes");

    expect(
      earliestSlot.time.isBefore(noticeThreshold),
      `Earliest slot ${earliestSlot.time.toISOString()} should be at or after ` +
        `the notice threshold ${noticeThreshold.toISOString()}`
    ).toBe(false);
  });
});
