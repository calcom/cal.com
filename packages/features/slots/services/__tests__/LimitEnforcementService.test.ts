import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";
import type { CheckBookingLimitsService } from "@calcom/features/bookings/lib/checkBookingLimits";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { BusyTimesService } from "@calcom/features/busyTimes/services/getBusyTimes";

import { LimitEnforcementService } from "../LimitEnforcementService";

describe("LimitEnforcementService", () => {
  let mockBusyTimesService: BusyTimesService;
  let mockUserAvailabilityService: UserAvailabilityService;
  let mockCheckBookingLimitsService: CheckBookingLimitsService;
  let mockBookingRepo: BookingRepository;
  let service: LimitEnforcementService;

  const mockUsers = [
    { id: 1, email: "user1@test.com" },
    { id: 2, email: "user2@test.com" },
  ];

  const mockEventType = {
    id: 1,
    length: 30,
  };

  beforeEach(() => {
    mockBusyTimesService = {
      getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
        limitDateFrom: dayjs("2024-01-01"),
        limitDateTo: dayjs("2024-01-31"),
      }),
      getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
      getBusyTimes: vi.fn(),
    } as unknown as BusyTimesService;

    mockUserAvailabilityService = {
      getPeriodStartDatesBetween: vi.fn().mockReturnValue([dayjs("2024-01-15")]),
    } as unknown as UserAvailabilityService;

    mockCheckBookingLimitsService = {
      checkBookingLimit: vi.fn().mockResolvedValue(undefined),
    } as unknown as CheckBookingLimitsService;

    mockBookingRepo = {
      getTotalBookingDuration: vi.fn().mockResolvedValue(0),
      getAllAcceptedTeamBookingsOfUsers: vi.fn().mockResolvedValue([]),
    } as unknown as BookingRepository;

    service = new LimitEnforcementService({
      busyTimesService: mockBusyTimesService,
      userAvailabilityService: mockUserAvailabilityService,
      checkBookingLimitsService: mockCheckBookingLimitsService,
      bookingRepo: mockBookingRepo,
    });
  });

  describe("getBusyTimesFromLimitsForUsers", () => {
    it("should return empty map when no booking or duration limits are set", async () => {
      const result = await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        null,
        null,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        30,
        mockEventType,
        "UTC"
      );

      expect(result.size).toBe(0);
      expect(mockBusyTimesService.getBusyTimesForLimitChecks).not.toHaveBeenCalled();
    });

    it("should call getBusyTimesForLimitChecks when booking limits are set", async () => {
      const bookingLimits = { PER_DAY: 5 };

      await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        bookingLimits,
        null,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        30,
        mockEventType,
        "UTC"
      );

      expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: [1, 2],
          eventTypeId: 1,
          bookingLimits,
        })
      );
    });

    it("should return busy times for users who have reached their booking limit", async () => {
      const bookingLimits = { PER_DAY: 2 };
      const existingBookings = [
        {
          id: 1,
          userId: 1,
          start: dayjs("2024-01-15T10:00:00Z").toDate(),
          end: dayjs("2024-01-15T10:30:00Z").toDate(),
        },
        {
          id: 2,
          userId: 1,
          start: dayjs("2024-01-15T11:00:00Z").toDate(),
          end: dayjs("2024-01-15T11:30:00Z").toDate(),
        },
      ];

      vi.mocked(mockBusyTimesService.getBusyTimesForLimitChecks).mockResolvedValue(existingBookings);

      const result = await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        bookingLimits,
        null,
        dayjs("2024-01-15"),
        dayjs("2024-01-15"),
        30,
        mockEventType,
        "UTC"
      );

      expect(result.has(1)).toBe(true);
      expect(result.get(1)?.length).toBeGreaterThan(0);
    });

    it("should handle duration limits", async () => {
      const durationLimits = { PER_DAY: 60 };

      await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        null,
        durationLimits,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        30,
        mockEventType,
        "UTC"
      );

      expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
        expect.objectContaining({
          durationLimits,
        })
      );
    });

    it("should mark period as busy when duration exceeds limit", async () => {
      const durationLimits = { PER_DAY: 60 };
      const existingBookings = [
        {
          id: 1,
          userId: 1,
          start: dayjs("2024-01-15T10:00:00Z").toDate(),
          end: dayjs("2024-01-15T11:00:00Z").toDate(),
        },
      ];

      vi.mocked(mockBusyTimesService.getBusyTimesForLimitChecks).mockResolvedValue(existingBookings);

      const result = await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        null,
        durationLimits,
        dayjs("2024-01-15"),
        dayjs("2024-01-15"),
        30,
        mockEventType,
        "UTC"
      );

      expect(result.has(1)).toBe(true);
    });

    it("should use checkBookingLimitsService for yearly limits", async () => {
      const bookingLimits = { PER_YEAR: 100 };

      vi.mocked(mockUserAvailabilityService.getPeriodStartDatesBetween).mockReturnValue([
        dayjs("2024-01-01"),
      ]);

      await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        bookingLimits,
        null,
        dayjs("2024-01-01"),
        dayjs("2024-12-31"),
        30,
        mockEventType,
        "UTC"
      );

      expect(mockCheckBookingLimitsService.checkBookingLimit).toHaveBeenCalled();
    });

    it("should mark period as busy when yearly limit check throws", async () => {
      const bookingLimits = { PER_YEAR: 100 };

      vi.mocked(mockUserAvailabilityService.getPeriodStartDatesBetween).mockReturnValue([
        dayjs("2024-01-01"),
      ]);
      vi.mocked(mockCheckBookingLimitsService.checkBookingLimit).mockRejectedValue(
        new Error("Limit exceeded")
      );

      const result = await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        bookingLimits,
        null,
        dayjs("2024-01-01"),
        dayjs("2024-12-31"),
        30,
        mockEventType,
        "UTC"
      );

      expect(result.has(1)).toBe(true);
      expect(result.get(1)?.length).toBeGreaterThan(0);
    });

    it("should handle rescheduleUid parameter", async () => {
      const bookingLimits = { PER_DAY: 5 };
      const rescheduleUid = "reschedule-123";

      await service.getBusyTimesFromLimitsForUsers(
        mockUsers,
        bookingLimits,
        null,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        30,
        mockEventType,
        "UTC",
        rescheduleUid
      );

      expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
        expect.objectContaining({
          rescheduleUid,
        })
      );
    });
  });

  describe("getBusyTimesFromTeamLimitsForUsers", () => {
    it("should fetch team bookings and apply limits", async () => {
      const bookingLimits = { PER_DAY: 5 };
      const teamId = 123;

      await service.getBusyTimesFromTeamLimitsForUsers(
        mockUsers,
        bookingLimits,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        teamId,
        false,
        "UTC"
      );

      expect(mockBookingRepo.getAllAcceptedTeamBookingsOfUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          users: mockUsers,
          teamId,
          includeManagedEvents: false,
        })
      );
    });

    it("should include managed events when flag is set", async () => {
      const bookingLimits = { PER_DAY: 5 };
      const teamId = 123;

      await service.getBusyTimesFromTeamLimitsForUsers(
        mockUsers,
        bookingLimits,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        teamId,
        true,
        "UTC"
      );

      expect(mockBookingRepo.getAllAcceptedTeamBookingsOfUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          includeManagedEvents: true,
        })
      );
    });

    it("should return busy times when team booking limit is reached", async () => {
      const bookingLimits = { PER_DAY: 2 };
      const teamBookings = [
        {
          id: 1,
          userId: 1,
          startTime: dayjs("2024-01-15T10:00:00Z").toDate(),
          endTime: dayjs("2024-01-15T10:30:00Z").toDate(),
          eventTypeId: 1,
          title: "Meeting 1",
        },
        {
          id: 2,
          userId: 1,
          startTime: dayjs("2024-01-15T11:00:00Z").toDate(),
          endTime: dayjs("2024-01-15T11:30:00Z").toDate(),
          eventTypeId: 1,
          title: "Meeting 2",
        },
      ];

      vi.mocked(mockBookingRepo.getAllAcceptedTeamBookingsOfUsers).mockResolvedValue(teamBookings);

      const result = await service.getBusyTimesFromTeamLimitsForUsers(
        mockUsers,
        bookingLimits,
        dayjs("2024-01-15"),
        dayjs("2024-01-15"),
        123,
        false,
        "UTC"
      );

      expect(result.has(1)).toBe(true);
    });

    it("should handle rescheduleUid for team limits", async () => {
      const bookingLimits = { PER_DAY: 5 };
      const rescheduleUid = "reschedule-456";

      await service.getBusyTimesFromTeamLimitsForUsers(
        mockUsers,
        bookingLimits,
        dayjs("2024-01-01"),
        dayjs("2024-01-31"),
        123,
        false,
        "UTC",
        rescheduleUid
      );

      expect(mockBookingRepo.getAllAcceptedTeamBookingsOfUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          excludedUid: rescheduleUid,
        })
      );
    });

    it("should use checkBookingLimitsService for yearly team limits", async () => {
      const bookingLimits = { PER_YEAR: 100 };

      vi.mocked(mockUserAvailabilityService.getPeriodStartDatesBetween).mockReturnValue([
        dayjs("2024-01-01"),
      ]);

      await service.getBusyTimesFromTeamLimitsForUsers(
        mockUsers,
        bookingLimits,
        dayjs("2024-01-01"),
        dayjs("2024-12-31"),
        123,
        true,
        "UTC"
      );

      expect(mockCheckBookingLimitsService.checkBookingLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 123,
          includeManagedEvents: true,
        })
      );
    });
  });
});
