import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - _getBusyTimesFromLimitsForUsers", () => {
  type BusyTimesFromLimitsForUsers = typeof AvailableSlotsService.prototype._getBusyTimesFromLimitsForUsers;
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      getTotalBookingDuration: ReturnType<typeof vi.fn>;
    };
    busyTimesService: {
      getStartEndDateforLimitCheck: ReturnType<typeof vi.fn>;
      getBusyTimesForLimitChecks: ReturnType<typeof vi.fn>;
    };
    userAvailabilityService: {
      getPeriodStartDatesBetween: ReturnType<typeof vi.fn>;
    };
    checkBookingLimitsService: {
      checkBookingLimit: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        getTotalBookingDuration: vi.fn(),
      },
      busyTimesService: {
        getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
          limitDateFrom: dayjs("2026-01-01"),
          limitDateTo: dayjs("2026-12-31"),
        }),
        getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
      },
      userAvailabilityService: {
        getPeriodStartDatesBetween: vi.fn().mockReturnValue([dayjs("2026-01-01")]),
      },
      checkBookingLimitsService: {
        checkBookingLimit: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  describe("yearly duration limit pre-fetching optimization", () => {
    const users = [
      { id: 29, email: "user29@example.com" },
      { id: 31, email: "user31@example.com" },
    ];
    const eventType = { id: 52, length: 30 };
    const dateFrom = dayjs("2026-01-01");
    const dateTo = dayjs("2026-12-31");
    const timeZone = "UTC";

    it("should call getTotalBookingDuration once for yearly duration limits instead of N times", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 480 };
      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(180);

      await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone
      );

      expect(mockDependencies.bookingRepo.getTotalBookingDuration).toHaveBeenCalledTimes(1);
      expect(mockDependencies.bookingRepo.getTotalBookingDuration).toHaveBeenCalledWith({
        eventId: 52,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        rescheduleUid: undefined,
      });
    });

    it("should not call getTotalBookingDuration when no PER_YEAR duration limit", async () => {
      const durationLimits: IntervalLimit = { PER_DAY: 120 };

      await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone
      );

      expect(mockDependencies.bookingRepo.getTotalBookingDuration).not.toHaveBeenCalled();
    });

    it("should not call getTotalBookingDuration when no duration limits at all", async () => {
      await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(users, null, null, dateFrom, dateTo, 30, eventType, timeZone);

      expect(mockDependencies.bookingRepo.getTotalBookingDuration).not.toHaveBeenCalled();
    });

    it("should pass rescheduleUid to getTotalBookingDuration when provided", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 480 };
      const rescheduleUid = "existing-booking-uid";

      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(0);

      await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone,
        rescheduleUid
      );

      expect(mockDependencies.bookingRepo.getTotalBookingDuration).toHaveBeenCalledWith(
        expect.objectContaining({
          rescheduleUid: "existing-booking-uid",
        })
      );
    });

    it("should call getTotalBookingDuration for each year when date range spans multiple years", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 480 };
      const multiYearDateFrom = dayjs("2025-12-01");
      const multiYearDateTo = dayjs("2026-02-28");

      mockDependencies.userAvailabilityService.getPeriodStartDatesBetween.mockReturnValue([
        dayjs("2025-01-01"),
        dayjs("2026-01-01"),
      ]);

      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(0);

      await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        multiYearDateFrom,
        multiYearDateTo,
        30,
        eventType,
        timeZone
      );

      expect(mockDependencies.bookingRepo.getTotalBookingDuration).toHaveBeenCalledTimes(2);
    });

    it("should mark user as busy when yearly duration limit is exceeded", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 100 };
      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(90);

      const result = await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone
      );

      expect(result.get(29)).toBeDefined();
      expect(result.get(29)?.length).toBeGreaterThan(0);
    });

    it("should not mark user as busy when yearly duration limit is not exceeded", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 500 };
      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(120);

      const result = await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone
      );

      expect(result.get(29) ?? []).toHaveLength(0);
      expect(result.get(31) ?? []).toHaveLength(0);
    });

    it("should handle users with no bookings (0 duration) correctly", async () => {
      const durationLimits: IntervalLimit = { PER_YEAR: 100 };
      mockDependencies.bookingRepo.getTotalBookingDuration.mockResolvedValue(0);

      const result = await (
        service as unknown as { _getBusyTimesFromLimitsForUsers: BusyTimesFromLimitsForUsers }
      )._getBusyTimesFromLimitsForUsers(
        users,
        null,
        durationLimits,
        dateFrom,
        dateTo,
        30,
        eventType,
        timeZone
      );

      expect(result.get(29) ?? []).toHaveLength(0);
      expect(result.get(31) ?? []).toHaveLength(0);
    });
  });
});
