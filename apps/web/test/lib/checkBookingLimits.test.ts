import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { getCheckBookingLimitsService } from "@calcom/features/di/containers/BookingLimits";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";

const mockCountBookingsByEventTypeAndDateRange = vi.fn();
const mockGetAllAcceptedUserBookings = vi.fn();
const mockGetAllAcceptedTeamBookingsOfUser = vi.fn();

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    countBookingsByEventTypeAndDateRange: mockCountBookingsByEventTypeAndDateRange,
    getAllAcceptedUserBookings: mockGetAllAcceptedUserBookings,
    getAllAcceptedTeamBookingsOfUser: mockGetAllAcceptedTeamBookingsOfUser,
  })),
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

const MOCK_USER = {
  id: 101,
  email: "user@example.com",
};

const MOCK_TEAM_ID = 1;

const checkBookingLimitsService = getCheckBookingLimitsService();

describe("Check Booking Limits Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Type Limits", () => {
    it("Should pass when under event type limit", async () => {
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);
      await expect(
        checkBookingLimitsService.checkBookingLimits(
          MOCK_DATA.bookingLimits,
          MOCK_DATA.startDate,
          MOCK_DATA.id
        )
      ).resolves.toBeTruthy();
    });

    it("Should throw error when event type limit exceeded", async () => {
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(2);
      await expect(
        checkBookingLimitsService.checkBookingLimits(
          MOCK_DATA.bookingLimits,
          MOCK_DATA.startDate,
          MOCK_DATA.id
        )
      ).rejects.toThrowError("booking_limit_reached");
    });

    it("Should pass with multiple event type booking limits", async () => {
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);
      await expect(
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

    it("Should handle multiple event type limits correctly", async () => {
      // First limit check passes (1 booking < 2 limit)
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(1);
      await expect(
        checkBookingLimitsService.checkBookingLimit({
          key: "PER_DAY",
          limitingNumber: 2,
          eventStartDate: MOCK_DATA.startDate,
          eventId: MOCK_DATA.id,
        })
      ).resolves.not.toThrow();

      // Second limit check fails (3 bookings >= 2 limit)
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(3);
      await expect(
        checkBookingLimitsService.checkBookingLimit({
          key: "PER_WEEK",
          limitingNumber: 2,
          eventStartDate: MOCK_DATA.startDate,
          eventId: MOCK_DATA.id,
        })
      ).rejects.toThrowError("booking_limit_reached");
    });

    it("Should respect rescheduleUid and not count rescheduled booking", async () => {
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(0);
      await expect(
        checkBookingLimitsService.checkBookingLimits(
          { PER_DAY: 1 },
          MOCK_DATA.startDate,
          MOCK_DATA.id,
          "reschedule-uid-123"
        )
      ).resolves.toBeTruthy();
    });
  });

  describe("Priority: Team Limits > User Limits > Event Type Limits", () => {
    it("Should use team limits when both teamId and user provided (team takes precedence)", async () => {
      // Team limit check should be called, not user limit
      mockGetAllAcceptedTeamBookingsOfUser.mockResolvedValue(1);
      mockGetAllAcceptedUserBookings.mockResolvedValue(999); // Should not be called

      await expect(
        checkBookingLimitsService.checkBookingLimit({
          key: "PER_DAY",
          limitingNumber: 2,
          eventStartDate: MOCK_DATA.startDate,
          eventId: MOCK_DATA.id,
          teamId: MOCK_TEAM_ID,
          user: MOCK_USER,
        })
      ).resolves.not.toThrow();

      expect(mockGetAllAcceptedTeamBookingsOfUser).toHaveBeenCalled();
      expect(mockGetAllAcceptedUserBookings).not.toHaveBeenCalled();
    });

    it("Should use user limits when only user provided (no teamId)", async () => {
      mockGetAllAcceptedUserBookings.mockResolvedValue(1);
      mockGetAllAcceptedTeamBookingsOfUser.mockResolvedValue(999); // Should not be called

      await expect(
        checkBookingLimitsService.checkBookingLimit({
          key: "PER_DAY",
          limitingNumber: 2,
          eventStartDate: MOCK_DATA.startDate,
          eventId: MOCK_DATA.id,
          user: MOCK_USER,
        })
      ).resolves.not.toThrow();

      expect(mockGetAllAcceptedUserBookings).toHaveBeenCalled();
      expect(mockGetAllAcceptedTeamBookingsOfUser).not.toHaveBeenCalled();
    });

    it("Should use event type limits when neither user nor teamId provided", async () => {
      mockCountBookingsByEventTypeAndDateRange.mockResolvedValue(1);
      mockGetAllAcceptedUserBookings.mockResolvedValue(999); // Should not be called
      mockGetAllAcceptedTeamBookingsOfUser.mockResolvedValue(999); // Should not be called

      await expect(
        checkBookingLimitsService.checkBookingLimit({
          key: "PER_DAY",
          limitingNumber: 2,
          eventStartDate: MOCK_DATA.startDate,
          eventId: MOCK_DATA.id,
        })
      ).resolves.not.toThrow();

      expect(mockCountBookingsByEventTypeAndDateRange).toHaveBeenCalled();
      expect(mockGetAllAcceptedUserBookings).not.toHaveBeenCalled();
      expect(mockGetAllAcceptedTeamBookingsOfUser).not.toHaveBeenCalled();
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

  it("Should validate complex multi-level limits", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 2, PER_WEEK: 10, PER_MONTH: 30, PER_YEAR: 200 })).toBe(true);
  });

  it("Should invalidate when week limit is less than day limit", () => {
    expect(validateIntervalLimitOrder({ PER_DAY: 5, PER_WEEK: 3 })).toBe(false);
  });
});
