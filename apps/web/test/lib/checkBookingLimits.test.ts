import dayjs from "@calcom/dayjs";
import { validateIntervalLimitOrder } from "@calcom/lib";
import { checkBookingLimits, checkBookingLimit } from "@calcom/lib/server";
import type { IntervalLimit } from "@calcom/types/Calendar";

import { prismaMock } from "../../../../tests/config/singleton";

type Mockdata = {
  id: number;
  startDate: Date;
  bookingLimits: IntervalLimit;
};

const MOCK_DATA: Mockdata = {
  id: 1,
  startDate: dayjs("2022-09-30T09:00:00+01:00").toDate(),
  bookingLimits: {
    PER_DAY: 1,
  },
};

describe("Check Booking Limits Tests", () => {
  it("Should return no errors", async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    expect(
      checkBookingLimits(MOCK_DATA.bookingLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).resolves.toBeTruthy();
  });
  it("Should throw an error", async () => {
    // Mock there being two a day
    prismaMock.booking.count.mockResolvedValue(2);
    expect(
      checkBookingLimits(MOCK_DATA.bookingLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).rejects.toThrowError();
  });

  it("Should pass with multiple booking limits", async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    expect(
      checkBookingLimits(
        {
          PER_DAY: 1,
          PER_WEEK: 2,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should pass with multiple booking limits with one undefined", async () => {
    prismaMock.booking.count.mockResolvedValue(0);
    expect(
      checkBookingLimits(
        {
          PER_DAY: 1,
          PER_WEEK: undefined,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should handle mutiple limits correctly", async () => {
    prismaMock.booking.count.mockResolvedValue(1);
    expect(
      checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: 2,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
      })
    ).resolves.not.toThrow();
    prismaMock.booking.count.mockResolvedValue(3);
    expect(
      checkBookingLimit({
        key: "PER_WEEK",
        limitingNumber: 2,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
      })
    ).rejects.toThrowError();
  });
  it("Should return busyTimes when set", async () => {
    prismaMock.booking.count.mockResolvedValue(2);
    expect(
      checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: 2,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
        returnBusyTimes: true,
      })
    ).resolves.toEqual({
      start: dayjs(MOCK_DATA.startDate).startOf("day").toDate(),
      end: dayjs(MOCK_DATA.startDate).endOf("day").toDate(),
    });
  });
});

describe("Booking limit validation", () => {
  it("Should validate a correct limit", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 3, PER_MONTH: 5 })).toBe(true);
  });

  it("Should invalidate an incorrect limit", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 9, PER_MONTH: 5 })).toBe(false);
  });

  it("Should validate a correct limit with 'gaps' ", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 9, PER_YEAR: 25 })).toBe(true);
  });

  it("Should validate a correct limit with equal values ", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 1, PER_YEAR: 1 })).toBe(true);
  });
  it("Should validate a correct with empty", () => {
    expect(validateIntervalLimitOrder({})).toBe(true);
  });
});
