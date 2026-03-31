import dayjs from "@calcom/dayjs";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

describe("AvailableSlotsService - _getBusyTimesFromTeamLimitsForUsers", () => {
  type BusyTimesFromTeamLimitsForUsers =
    typeof AvailableSlotsService.prototype._getBusyTimesFromTeamLimitsForUsers;
  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      getAllAcceptedTeamBookingsOfUsers: ReturnType<typeof vi.fn>;
    };
    busyTimesService: {
      getStartEndDateforLimitCheck: ReturnType<typeof vi.fn>;
    };
    userAvailabilityService: {
      getPeriodStartDatesBetween: ReturnType<typeof vi.fn>;
    };
    checkBookingLimitsService: {
      checkBookingLimit: ReturnType<typeof vi.fn>;
    };
  };

  const users = [
    { id: 1, email: "user1@example.com" },
    { id: 2, email: "user2@example.com" },
  ];
  const teamId = 10;
  const dateFrom = dayjs("2026-04-01");
  const dateTo = dayjs("2026-04-30");

  function callMethod(bookingLimits: IntervalLimit, timeZone = "UTC") {
    return (
      service as unknown as {
        _getBusyTimesFromTeamLimitsForUsers: BusyTimesFromTeamLimitsForUsers;
      }
    )._getBusyTimesFromTeamLimitsForUsers(users, bookingLimits, dateFrom, dateTo, teamId, false, timeZone);
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        getAllAcceptedTeamBookingsOfUsers: vi.fn().mockResolvedValue([]),
      },
      busyTimesService: {
        getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
          limitDateFrom: dateFrom,
          limitDateTo: dateTo,
        }),
      },
      userAvailabilityService: {
        getPeriodStartDatesBetween: vi.fn().mockReturnValue([dayjs("2026-04-01")]),
      },
      checkBookingLimitsService: {
        checkBookingLimit: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  describe("per-user booking grouping", () => {
    it("should return busy times keyed by correct user id", async () => {
      const bookingLimits: IntervalLimit = { PER_DAY: 1 };

      mockDependencies.userAvailabilityService.getPeriodStartDatesBetween.mockReturnValue([
        dayjs("2026-04-01"),
      ]);

      // Only user 2 has a booking — user 1 should not be affected at per-user level
      // (global limit of 1 will be hit, making both busy via global propagation)
      mockDependencies.bookingRepo.getAllAcceptedTeamBookingsOfUsers.mockResolvedValue([
        {
          id: 1,
          uid: "a",
          startTime: new Date("2026-04-01T09:00:00Z"),
          endTime: new Date("2026-04-01T09:30:00Z"),
          eventTypeId: 50,
          title: "Booking 1",
          userId: 2,
        },
      ]);

      const result = await callMethod(bookingLimits);

      // Both users should have entries in the result map
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
      // Global limit hit by user 2's booking, both get marked busy
      expect(result.get(1)?.length).toBeGreaterThan(0);
      expect(result.get(2)?.length).toBeGreaterThan(0);
    });
  });

  describe("timezone-aware day computation", () => {
    it("should assign booking to correct day in positive-offset timezone", async () => {
      const bookingLimits: IntervalLimit = { PER_DAY: 1 };

      // Booking at 2026-04-01T23:30:00Z = 2026-04-02 in Auckland (+12/+13)
      mockDependencies.userAvailabilityService.getPeriodStartDatesBetween.mockReturnValue([
        dayjs("2026-04-01"),
        dayjs("2026-04-02"),
      ]);

      mockDependencies.bookingRepo.getAllAcceptedTeamBookingsOfUsers.mockResolvedValue([
        {
          id: 1,
          uid: "a",
          startTime: new Date("2026-04-01T23:30:00Z"),
          endTime: new Date("2026-04-02T00:00:00Z"),
          eventTypeId: 50,
          title: "Late UTC booking",
          userId: 1,
        },
      ]);

      const result = await callMethod(bookingLimits, "Pacific/Auckland");

      // In Auckland this booking falls on April 2, not April 1
      // So user should be busy on April 2's period, not April 1's
      const busyTimes = result.get(1) ?? [];
      const busyDays = busyTimes.map((bt: { start: string }) => bt.start.slice(0, 10));
      expect(busyDays).toContain("2026-04-02");
      expect(busyDays).not.toContain("2026-04-01");
    });

    it("should assign booking to correct day in negative-offset timezone", async () => {
      const bookingLimits: IntervalLimit = { PER_DAY: 1 };

      // Booking at 2026-04-02T02:00:00Z = 2026-04-01 in New York (-4)
      mockDependencies.userAvailabilityService.getPeriodStartDatesBetween.mockReturnValue([
        dayjs("2026-04-01"),
        dayjs("2026-04-02"),
      ]);

      mockDependencies.bookingRepo.getAllAcceptedTeamBookingsOfUsers.mockResolvedValue([
        {
          id: 1,
          uid: "a",
          startTime: new Date("2026-04-02T02:00:00Z"),
          endTime: new Date("2026-04-02T02:30:00Z"),
          eventTypeId: 50,
          title: "Early UTC booking",
          userId: 1,
        },
      ]);

      const result = await callMethod(bookingLimits, "America/New_York");

      const busyTimes = result.get(1) ?? [];
      const busyDays = busyTimes.map((bt: { start: string }) => bt.start.slice(0, 10));
      expect(busyDays).toContain("2026-04-01");
      expect(busyDays).not.toContain("2026-04-02");
    });
  });

  describe("global limit propagation", () => {
    it("should propagate global limit to all users when total bookings exceed limit", async () => {
      const bookingLimits: IntervalLimit = { PER_DAY: 2 };

      mockDependencies.userAvailabilityService.getPeriodStartDatesBetween.mockReturnValue([
        dayjs("2026-04-01"),
      ]);

      // 2 bookings total across different users = global limit reached
      mockDependencies.bookingRepo.getAllAcceptedTeamBookingsOfUsers.mockResolvedValue([
        {
          id: 1,
          uid: "a",
          startTime: new Date("2026-04-01T09:00:00Z"),
          endTime: new Date("2026-04-01T09:30:00Z"),
          eventTypeId: 50,
          title: "Booking 1",
          userId: 1,
        },
        {
          id: 2,
          uid: "b",
          startTime: new Date("2026-04-01T10:00:00Z"),
          endTime: new Date("2026-04-01T10:30:00Z"),
          eventTypeId: 50,
          title: "Booking 2",
          userId: 2,
        },
      ]);

      const result = await callMethod(bookingLimits);

      // Both users should be marked busy because the TEAM limit (global) is reached
      expect(result.get(1)?.length).toBeGreaterThan(0);
      expect(result.get(2)?.length).toBeGreaterThan(0);
    });
  });

  describe("with no bookings", () => {
    it("should return empty busy times for all users", async () => {
      const bookingLimits: IntervalLimit = { PER_DAY: 5 };

      const result = await callMethod(bookingLimits);

      expect(result.get(1) ?? []).toHaveLength(0);
      expect(result.get(2) ?? []).toHaveLength(0);
    });
  });
});
