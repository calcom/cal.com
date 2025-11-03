import { describe, it, expect, vi } from "vitest";

import { BookingDateInPastError, isTimeOutOfBounds } from "@calcom/lib/isOutOfBounds";

import { TRPCError } from "@trpc/server";

import { AvailableSlotsService } from "./util";

vi.mock("@calcom/lib/intervalLimits/isBookingLimits", () => ({
  parseBookingLimit: vi.fn((obj: unknown) => {
    if (obj && typeof obj === "object" && "PER_DAY" in obj) {
      return obj;
    }
    return null;
  }),
  parseDurationLimit: vi.fn(() => null),
  isBookingLimit: vi.fn(() => true),
}));

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

describe("Booking Limits Timezone Alignment", () => {
  it("should use event schedule timezone for booking limits calculation", async () => {
    const getBusyTimesFromLimitsForUsersSpy = vi
      .spyOn(AvailableSlotsService.prototype as any, "_getBusyTimesFromLimitsForUsers")
      .mockResolvedValue(new Map());

    const getOOODatesSpy = vi
      .spyOn(AvailableSlotsService.prototype as any, "_getOOODates")
      .mockResolvedValue([]);

    const mockDependencies = {
      oooRepo: {} as any,
      scheduleRepo: {} as any,
      selectedSlotRepo: {} as any,
      teamRepo: {} as any,
      userRepo: {} as any,
      bookingRepo: {
        findAllExistingBookingsForEventTypeBetween: vi.fn().mockResolvedValue([]),
      } as any,
      eventTypeRepo: {
        findForSlots: vi.fn().mockResolvedValue({
          id: 1,
          length: 30,
          slotInterval: 30,
          minimumBookingNotice: 0,
          bookingLimits: { PER_DAY: 1 },
          schedule: {
            id: 1,
            timeZone: "America/Los_Angeles",
            availability: [],
          },
          timeZone: null,
          hosts: [
            {
              isFixed: true,
              user: {
                id: 101,
                email: "host@example.com",
                timeZone: "America/New_York",
                credentials: [],
                selectedCalendars: [],
              },
            },
          ],
          users: [],
        }),
      } as any,
      routingFormResponseRepo: {} as any,
      cacheService: {
        getShouldServeCache: vi.fn().mockResolvedValue(false),
      } as any,
      checkBookingLimitsService: {} as any,
      userAvailabilityService: {
        getUsersAvailability: vi.fn().mockResolvedValue([
          {
            busy: [],
            dateRanges: [],
            oooExcludedDateRanges: [],
            timeZone: "America/New_York",
            datesOutOfOffice: [],
          },
        ]),
        getPeriodStartDatesBetween: vi.fn().mockReturnValue([]),
      } as any,
      busyTimesService: {
        getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
        getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
          limitDateFrom: { toDate: () => new Date() },
          limitDateTo: { toDate: () => new Date() },
        }),
      } as any,
      redisClient: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      } as any,
      featuresRepo: {
        checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
      } as any,
      qualifiedHostsService: {
        findQualifiedHostsWithDelegationCredentials: vi.fn().mockResolvedValue({
          qualifiedRRHosts: [],
          allFallbackRRHosts: [],
          fixedHosts: [
            {
              isFixed: true,
              user: {
                id: 101,
                email: "host@example.com",
                timeZone: "America/New_York",
                credentials: [],
              },
            },
          ],
        }),
      } as any,
      noSlotsNotificationService: {} as any,
    };

    const service = new AvailableSlotsService(mockDependencies);

    try {
      await (service as any)._getAvailableSlots({
        input: {
          eventTypeId: 1,
          startTime: "2025-01-02T00:00:00.000Z",
          endTime: "2025-01-03T00:00:00.000Z",
          timeZone: "Asia/Kolkata",
          duration: 30,
        },
        ctx: undefined,
      });
    } catch (_error) {
    }

    expect(getBusyTimesFromLimitsForUsersSpy).toHaveBeenCalled();
    const callArgs = getBusyTimesFromLimitsForUsersSpy.mock.calls[0];
    const timezoneArg = callArgs[7];
    expect(timezoneArg).toBe("America/Los_Angeles");

    getBusyTimesFromLimitsForUsersSpy.mockRestore();
    getOOODatesSpy.mockRestore();
  });

  it("should fallback to event timezone when schedule timezone is not set", async () => {
    const getBusyTimesFromLimitsForUsersSpy = vi
      .spyOn(AvailableSlotsService.prototype as any, "_getBusyTimesFromLimitsForUsers")
      .mockResolvedValue(new Map());

    const getOOODatesSpy = vi
      .spyOn(AvailableSlotsService.prototype as any, "_getOOODates")
      .mockResolvedValue([]);

    const mockDependencies = {
      oooRepo: {} as any,
      scheduleRepo: {} as any,
      selectedSlotRepo: {} as any,
      teamRepo: {} as any,
      userRepo: {} as any,
      bookingRepo: {
        findAllExistingBookingsForEventTypeBetween: vi.fn().mockResolvedValue([]),
      } as any,
      eventTypeRepo: {
        findForSlots: vi.fn().mockResolvedValue({
          id: 1,
          length: 30,
          slotInterval: 30,
          minimumBookingNotice: 0,
          bookingLimits: { PER_DAY: 1 },
          schedule: null,
          timeZone: "Europe/London",
          hosts: [
            {
              isFixed: true,
              user: {
                id: 101,
                email: "host@example.com",
                timeZone: "America/New_York",
                credentials: [],
                selectedCalendars: [],
              },
            },
          ],
          users: [],
        }),
      } as any,
      routingFormResponseRepo: {} as any,
      cacheService: {
        getShouldServeCache: vi.fn().mockResolvedValue(false),
      } as any,
      checkBookingLimitsService: {} as any,
      userAvailabilityService: {
        getUsersAvailability: vi.fn().mockResolvedValue([
          {
            busy: [],
            dateRanges: [],
            oooExcludedDateRanges: [],
            timeZone: "America/New_York",
            datesOutOfOffice: [],
          },
        ]),
        getPeriodStartDatesBetween: vi.fn().mockReturnValue([]),
      } as any,
      busyTimesService: {
        getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
        getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
          limitDateFrom: { toDate: () => new Date() },
          limitDateTo: { toDate: () => new Date() },
        }),
      } as any,
      redisClient: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      } as any,
      featuresRepo: {
        checkIfTeamHasFeature: vi.fn().mockResolvedValue(false),
      } as any,
      qualifiedHostsService: {
        findQualifiedHostsWithDelegationCredentials: vi.fn().mockResolvedValue({
          qualifiedRRHosts: [],
          allFallbackRRHosts: [],
          fixedHosts: [
            {
              isFixed: true,
              user: {
                id: 101,
                email: "host@example.com",
                timeZone: "America/New_York",
                credentials: [],
              },
            },
          ],
        }),
      } as any,
      noSlotsNotificationService: {} as any,
    };

    const service = new AvailableSlotsService(mockDependencies);

    try {
      await (service as any)._getAvailableSlots({
        input: {
          eventTypeId: 1,
          startTime: "2025-01-02T00:00:00.000Z",
          endTime: "2025-01-03T00:00:00.000Z",
          timeZone: "Asia/Kolkata",
          duration: 30,
        },
        ctx: undefined,
      });
    } catch (_error) {
    }

    expect(getBusyTimesFromLimitsForUsersSpy).toHaveBeenCalled();
    const callArgs = getBusyTimesFromLimitsForUsersSpy.mock.calls[0];
    const timezoneArg = callArgs[7];
    expect(timezoneArg).toBe("Europe/London");

    getBusyTimesFromLimitsForUsersSpy.mockRestore();
    getOOODatesSpy.mockRestore();
  });
});
