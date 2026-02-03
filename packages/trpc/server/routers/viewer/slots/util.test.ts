import { describe, it, expect, vi, beforeEach } from "vitest";
import dayjs from "@calcom/dayjs";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";

import { TRPCError } from "@trpc/server";

// Mock dependencies for AvailableSlotsService
const createMockDependencies = (overrides: {
  bookingRepo?: {
    findByUidIncludeEventType?: ReturnType<typeof vi.fn>;
  };
  userRepo?: {
    findByEmail?: ReturnType<typeof vi.fn>;
  };
  userAvailabilityService?: {
    getUserAvailability?: ReturnType<typeof vi.fn>;
  };
} = {}) => ({
  selectedSlotRepo: { findUniqueByUid: vi.fn() },
  userRepo: {
    findByEmail: overrides.userRepo?.findByEmail ?? vi.fn().mockResolvedValue(null),
    findManyUsersForDynamicEventType: vi.fn(),
    findUsersByUsername: vi.fn(),
  },
  bookingRepo: {
    findByUidIncludeEventType:
      overrides.bookingRepo?.findByUidIncludeEventType ?? vi.fn().mockResolvedValue(null),
  },
  eventTypeRepo: {
    findForSlots: vi.fn(),
    findFirstEventTypeId: vi.fn(),
  },
  teamRepo: { findById: vi.fn() },
  userAvailabilityService: {
    getUserAvailability:
      overrides.userAvailabilityService?.getUserAvailability ?? vi.fn().mockResolvedValue(null),
  },
  busyTimesService: { getBusyTimes: vi.fn() },
});

describe("Guest Availability for Reschedule", () => {
  describe("_getGuestAvailabilityForReschedule", () => {
    it("should return null when booking is not found", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue(null),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      expect(result).toBeNull();
    });

    it("should return null when booking has no attendees", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [],
            eventType: null,
          }),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      expect(result).toBeNull();
    });

    it("should return null when guest is not a Cal.com user", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [{ email: "guest@external.com" }],
            eventType: null,
          }),
        },
        userRepo: {
          findByEmail: vi.fn().mockResolvedValue(null), // Guest not found
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      expect(result).toBeNull();
      expect(mockDeps.userRepo.findByEmail).toHaveBeenCalledWith({ email: "guest@external.com" });
    });

    it("should return guest availability when guest IS a Cal.com user with slots", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockGuestAvailability = {
        dateRanges: [
          { start: "2026-02-10T10:00:00Z", end: "2026-02-10T12:00:00Z" },
          { start: "2026-02-10T14:00:00Z", end: "2026-02-10T16:00:00Z" },
        ],
      };

      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [{ email: "guest@cal.com" }],
            eventType: null,
          }),
        },
        userRepo: {
          findByEmail: vi.fn().mockResolvedValue({ id: 2, email: "guest@cal.com" }),
        },
        userAvailabilityService: {
          getUserAvailability: vi.fn().mockResolvedValue(mockGuestAvailability),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      expect(result).toHaveLength(2);
      expect(result[0].start.toISOString()).toBe("2026-02-10T10:00:00.000Z");
      expect(result[0].end.toISOString()).toBe("2026-02-10T12:00:00.000Z");
    });

    it("should return empty array when guest IS a Cal.com user with NO availability", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockGuestAvailability = {
        dateRanges: [], // Guest has no available slots
      };

      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [{ email: "guest@cal.com" }],
            eventType: null,
          }),
        },
        userRepo: {
          findByEmail: vi.fn().mockResolvedValue({ id: 2, email: "guest@cal.com" }),
        },
        userAvailabilityService: {
          getUserAvailability: vi.fn().mockResolvedValue(mockGuestAvailability),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      // Important: Returns empty array (not null) - guest IS a Cal user but has no availability
      expect(result).toEqual([]);
      expect(result).not.toBeNull();
    });

    it("should exclude host emails from guest list", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [
              { email: "host@example.com" }, // Host is also in attendees
              { email: "guest@external.com" },
            ],
            eventType: {
              hosts: [{ user: { email: "cohost@example.com" } }],
              users: [{ id: 3, email: "teamuser@example.com" }],
            },
          }),
        },
        userRepo: {
          findByEmail: vi.fn().mockResolvedValue(null),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      // Should only check the actual guest, not the host
      expect(mockDeps.userRepo.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockDeps.userRepo.findByEmail).toHaveBeenCalledWith({ email: "guest@external.com" });
    });

    it("should return null on error and not throw", async () => {
      const { AvailableSlotsService } = await import("./util");
      const mockDeps = createMockDependencies({
        bookingRepo: {
          findByUidIncludeEventType: vi.fn().mockResolvedValue({
            user: { id: 1, email: "host@example.com" },
            attendees: [{ email: "guest@cal.com" }],
            eventType: null,
          }),
        },
        userRepo: {
          findByEmail: vi.fn().mockResolvedValue({ id: 2, email: "guest@cal.com" }),
        },
        userAvailabilityService: {
          getUserAvailability: vi.fn().mockRejectedValue(new Error("Service unavailable")),
        },
      });

      const service = new AvailableSlotsService(mockDeps as any);
      const result = await (service as any)._getGuestAvailabilityForReschedule({
        rescheduleUid: "test-uid",
        startTime: dayjs("2026-02-10T09:00:00Z"),
        endTime: dayjs("2026-02-10T17:00:00Z"),
        timeZone: "UTC",
      });

      // Should gracefully return null on error, not throw
      expect(result).toBeNull();
    });
  });
});

describe("BookingDateInPastError handling", () => {
  it("should convert BookingDateInPastError to TRPCError with BAD_REQUEST code", () => {
    const testFilteringLogic = () => {
      const mockSlot = {
        time: "2024-05-20T12:30:00.000Z", // Past date
        attendees: 1,
      };

      const mockEventType = {
        minimumBookingNotice: 0,
      };

      const isFutureLimitViolationForTheSlot = false; // Mock this to false

      let isOutOfBounds = false;
      try {
        // This will throw BookingDateInPastError for past dates
        isOutOfBounds = isTimeOutOfBounds({
          time: mockSlot.time,
          minimumBookingNotice: mockEventType.minimumBookingNotice,
        });
      } catch (error) {
        if (error instanceof BookingDateInPastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }

      return !isFutureLimitViolationForTheSlot && !isOutOfBounds;
    };

    // This should throw a TRPCError with BAD_REQUEST code
    expect(() => testFilteringLogic()).toThrow(TRPCError);
    expect(() => testFilteringLogic()).toThrow("Attempting to book a meeting in the past.");
  });
});
