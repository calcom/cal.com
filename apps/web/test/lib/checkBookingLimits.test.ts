import { describe, expect, it, vi } from "vitest";

import dayjs from "@calcom/dayjs";
import { getCheckBookingLimitsService } from "@calcom/features/di/containers/BookingLimits";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";

const mockCountBookingsByEventTypeAndDateRange = vi.fn();
vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(function () {
    return {
      countBookingsByEventTypeAndDateRange: mockCountBookingsByEventTypeAndDateRange,
    };
  }),
}));

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

const checkBookingLimitsService = getCheckBookingLimitsService();

describe("Check Booking Limits Tests", () => {
  it("Should return no errors", async () => {
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);
    expect(
      checkBookingLimitsService.checkBookingLimits(MOCK_DATA.bookingLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).resolves.toBeTruthy();
  });
  it("Should throw an error", async () => {
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(2);
    expect(
      checkBookingLimitsService.checkBookingLimits(MOCK_DATA.bookingLimits, MOCK_DATA.startDate, MOCK_DATA.id)
    ).rejects.toThrowError();
  });

  it("Should pass with multiple booking limits", async () => {
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);
    expect(
      checkBookingLimitsService.checkBookingLimits(
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
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);

    expect(
      checkBookingLimitsService.checkBookingLimits(
        {
          PER_DAY: 1,
          PER_WEEK: undefined,
        },
        MOCK_DATA.startDate,
        MOCK_DATA.id
      )
    ).resolves.toBeTruthy();
  });
  it("Should handle multiple limits correctly", async () => {
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(1);
    expect(
      checkBookingLimitsService.checkBookingLimit({
        key: "PER_DAY",
        limitingNumber: 2,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
      })
    ).resolves.not.toThrow();
    mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(3);
    expect(
      checkBookingLimitsService.checkBookingLimit({
        key: "PER_WEEK",
        limitingNumber: 2,
        eventStartDate: MOCK_DATA.startDate,
        eventId: MOCK_DATA.id,
      })
    ).rejects.toThrowError();
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
