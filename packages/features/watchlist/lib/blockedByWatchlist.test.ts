import { describe, it, expect, vi, beforeEach } from "vitest";

import { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";

/**
 * Tests for the blockedByWatchlist feature.
 *
 * When a user is added to the watchlist (blocked), their schedules are marked with
 * `blockedByWatchlist: true`. This causes getUserAvailability to return empty availability,
 * effectively making the user unavailable for bookings.
 *
 * This is particularly important for team events (Round Robin, Collective) where blocked
 * users should be gracefully excluded from the host pool rather than causing booking failures.
 */

// Mock dependencies
const mockEventTypeRepo = {
  findByIdForUserAvailability: vi.fn(),
};

const mockOooRepo = {
  getUserOutOfOfficeDays: vi.fn().mockResolvedValue([]),
  findUserOOODays: vi.fn().mockResolvedValue([]),
};

const mockBookingRepo = {
  getBookingsForUserAvailabilityCheck: vi.fn().mockResolvedValue([]),
};

const mockRedisClient = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
};

const mockHolidayRepo = {
  getHolidaysForUser: vi.fn().mockResolvedValue([]),
  findUserSettingsSelect: vi.fn().mockResolvedValue(null),
};

describe("blockedByWatchlist - Schedule Blocking", () => {
  let service: UserAvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new UserAvailabilityService({
      eventTypeRepo: mockEventTypeRepo as never,
      oooRepo: mockOooRepo as never,
      bookingRepo: mockBookingRepo as never,
      redisClient: mockRedisClient as never,
      holidayRepo: mockHolidayRepo as never,
    });
  });

  describe("User Schedule Blocking", () => {
    it("should return empty availability when user schedule is blocked", async () => {
      const blockedSchedule = {
        id: 1,
        timeZone: "UTC",
        blockedByWatchlist: true,
        availability: [
          {
            date: null,
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            days: [1, 2, 3, 4, 5],
          },
        ],
      };

      const mockUser = {
        id: 1,
        username: "blocked-user",
        email: "blocked@example.com",
        timeZone: "UTC",
        defaultScheduleId: 1,
        schedules: [blockedSchedule],
        bufferTime: 0,
        startTime: 0,
        endTime: 1440,
        timeFormat: 24,
        isPlatformManaged: false,
        availability: [],
        selectedCalendars: [],
        travelSchedules: [],
        credentials: [],
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
      };

      const result = await service._getUserAvailability(
        {
          userId: 1,
          username: "blocked-user",
          dateFrom: "2025-01-01T00:00:00Z",
          dateTo: "2025-01-01T23:59:59Z",
          returnDateOverrides: false,
          bypassBusyCalendarTimes: false,
        },
        {
          user: mockUser as never,
          busyTimesFromLimitsBookings: [],
        }
      );

      expect(result.dateRanges).toHaveLength(0);
      expect(result.oooExcludedDateRanges).toHaveLength(0);
      expect(result.workingHours).toHaveLength(0);
      expect(result.busy).toHaveLength(0);
    });

    it("should return normal availability when user schedule is NOT blocked", async () => {
      const normalSchedule = {
        id: 1,
        timeZone: "UTC",
        blockedByWatchlist: false,
        availability: [
          {
            date: null,
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            days: [1, 2, 3, 4, 5], // Monday-Friday
          },
        ],
      };

      const mockUser = {
        id: 2,
        username: "normal-user",
        email: "normal@example.com",
        timeZone: "UTC",
        defaultScheduleId: 1,
        schedules: [normalSchedule],
        bufferTime: 0,
        startTime: 0,
        endTime: 1440,
        timeFormat: 24,
        isPlatformManaged: false,
        availability: [],
        selectedCalendars: [],
        travelSchedules: [],
        credentials: [],
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
      };

      // Use a Monday date (2025-01-06)
      const result = await service._getUserAvailability(
        {
          userId: 2,
          username: "normal-user",
          dateFrom: "2025-01-06T00:00:00Z",
          dateTo: "2025-01-06T23:59:59Z",
          returnDateOverrides: false,
          bypassBusyCalendarTimes: false,
        },
        {
          user: mockUser as never,
          busyTimesFromLimitsBookings: [],
        }
      );

      expect(result.dateRanges.length).toBeGreaterThan(0);
    });
  });

  describe("Host Schedule Blocking (Team Events)", () => {
    it("should return empty availability when host-assigned schedule is blocked", async () => {
      const blockedHostSchedule = {
        id: 2,
        timeZone: "UTC",
        blockedByWatchlist: true,
        availability: [
          {
            date: null,
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            days: [1, 2, 3, 4, 5],
          },
        ],
      };

      const normalUserSchedule = {
        id: 1,
        timeZone: "UTC",
        blockedByWatchlist: false,
        availability: [
          {
            date: null,
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            days: [1, 2, 3, 4, 5],
          },
        ],
      };

      const mockUser = {
        id: 1,
        username: "host-user",
        email: "host@example.com",
        timeZone: "UTC",
        defaultScheduleId: 1,
        schedules: [normalUserSchedule], // User's default schedule is NOT blocked
        bufferTime: 0,
        startTime: 0,
        endTime: 1440,
        timeFormat: 24,
        isPlatformManaged: false,
        availability: [],
        selectedCalendars: [],
        travelSchedules: [],
        credentials: [],
        allSelectedCalendars: [],
        userLevelSelectedCalendars: [],
      };

      const mockEventType = {
        id: 100,
        timeZone: null,
        schedule: null,
        hosts: [
          {
            user: { id: 1 },
            schedule: blockedHostSchedule, // Host has BLOCKED schedule assigned
          },
        ],
        seatsPerTimeSlot: null,
        bookingLimits: null,
        durationLimits: null,
        beforeEventBuffer: 0,
        afterEventBuffer: 0,
      };

      const result = await service._getUserAvailability(
        {
          userId: 1,
          username: "host-user",
          dateFrom: "2025-01-06T00:00:00Z",
          dateTo: "2025-01-06T23:59:59Z",
          eventTypeId: 100,
          returnDateOverrides: false,
          bypassBusyCalendarTimes: false,
        },
        {
          user: mockUser as never,
          eventType: mockEventType as never,
          busyTimesFromLimitsBookings: [],
        }
      );

      // Expect empty availability because host schedule is blocked
      expect(result.dateRanges).toHaveLength(0);
      expect(result.oooExcludedDateRanges).toHaveLength(0);
    });
  });
});

