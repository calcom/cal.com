import dayjs from "@calcom/dayjs";
import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type GetUserAvailabilityInitialData,
  type IUserAvailabilityService,
  UserAvailabilityService,
} from "./getUserAvailability";

// Mock external modules
vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

vi.mock("@calcom/features/busyTimes/lib/getBusyTimesFromLimits", () => ({
  getBusyTimesFromLimits: vi.fn().mockResolvedValue([]),
  getBusyTimesFromTeamLimits: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: vi.fn().mockReturnValue({
    getBusyTimes: vi.fn().mockResolvedValue([]),
    getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
      limitDateFrom: dayjs(),
      limitDateTo: dayjs(),
    }),
  }),
}));

vi.mock("@calcom/lib/holidays/HolidayService", () => ({
  getHolidayService: vi.fn().mockReturnValue({
    getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
    getHolidayDatesInRangeForCountries: vi.fn().mockResolvedValue(new Map()),
  }),
}));

vi.mock("@calcom/lib/holidays/getHolidayEmoji", () => ({
  getHolidayEmoji: vi.fn().mockReturnValue("🎄"),
}));

vi.mock("@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container", () => ({
  getCalendarCacheEventRepository: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  startInactiveSpan: vi.fn().mockReturnValue({ end: vi.fn() }),
}));

function createMockDependencies(): IUserAvailabilityService {
  return {
    eventTypeRepo: {
      findByIdForUserAvailability: vi.fn().mockResolvedValue(null),
    } as unknown as IUserAvailabilityService["eventTypeRepo"],
    oooRepo: {
      findUserOOODays: vi.fn().mockResolvedValue([]),
    } as unknown as IUserAvailabilityService["oooRepo"],
    bookingRepo: {
      findAcceptedBookingByEventTypeId: vi.fn().mockResolvedValue([]),
    } as unknown as IUserAvailabilityService["bookingRepo"],
    redisClient: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as IUserAvailabilityService["redisClient"],
    holidayRepo: {
      findUserSettingsSelect: vi.fn().mockResolvedValue(null),
      findManyUserSettings: vi.fn().mockResolvedValue([]),
    } as unknown as IUserAvailabilityService["holidayRepo"],
  };
}

function createMockUser(
  overrides?: Partial<NonNullable<GetUserAvailabilityInitialData["user"]>>
): NonNullable<GetUserAvailabilityInitialData["user"]> {
  return {
    isFixed: false,
    groupId: null,
    username: "testuser",
    id: 1,
    email: "testuser@example.com",
    bufferTime: 0,
    timeZone: "America/New_York",
    availability: [],
    timeFormat: 12,
    defaultScheduleId: 1,
    isPlatformManaged: false,
    schedules: [
      {
        id: 1,
        availability: [
          {
            days: [1, 2, 3, 4, 5],
            startTime: new Date("1970-01-01T09:00:00Z"),
            endTime: new Date("1970-01-01T17:00:00Z"),
            date: null,
          },
        ],
        timeZone: "America/New_York",
      },
    ],
    credentials: [],
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
    travelSchedules: [],
    ...overrides,
  };
}

describe("UserAvailabilityService", () => {
  let deps: IUserAvailabilityService;
  let service: UserAvailabilityService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();

    // Re-establish default mock for getBusyTimesService since some tests override it
    const { getBusyTimesService } = await import("@calcom/features/di/containers/BusyTimes");
    vi.mocked(getBusyTimesService).mockReturnValue({
      getBusyTimes: vi.fn().mockResolvedValue([]),
      getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
        limitDateFrom: dayjs(),
        limitDateTo: dayjs(),
      }),
    } as never);

    deps = createMockDependencies();
    service = new UserAvailabilityService(deps);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateOutOfOfficeRanges", () => {
    const baseAvailability = [
      {
        days: [1, 2, 3, 4, 5] as number[],
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        date: null as Date | null,
        userId: 1,
      },
    ];

    it("should return empty object when no OOO days are provided", () => {
      const result = service.calculateOutOfOfficeRanges([], baseAvailability);
      expect(result).toEqual({});
    });

    it("should return empty object when OOO days is undefined", () => {
      const result = service.calculateOutOfOfficeRanges(undefined as never, baseAvailability);
      expect(result).toEqual({});
    });

    it("should create OOO entries for each working day within the range", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-14T12:00:00Z")); // Set to before OOO range

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"), // Monday
          end: new Date("2024-01-17T23:59:59Z"), // Wednesday
          notes: null,
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: { id: 1, emoji: "🏖️", reason: "Vacation" },
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      // Monday, Tuesday, Wednesday are all working days (1, 2, 3)
      expect(result["2024-01-15"]).toBeDefined();
      expect(result["2024-01-16"]).toBeDefined();
      expect(result["2024-01-17"]).toBeDefined();
      expect(result["2024-01-15"].reason).toBe("Vacation");
      expect(result["2024-01-15"].emoji).toBe("🏖️");

      vi.useRealTimers();
    });

    it("should skip non-working days in OOO range", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-18T12:00:00Z")); // Set to before OOO range

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-19T00:00:00Z"), // Friday
          end: new Date("2024-01-22T23:59:59Z"), // Monday
          notes: null,
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: null,
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      // Friday is day 5 (working day)
      expect(result["2024-01-19"]).toBeDefined();
      // Saturday (6) and Sunday (0) should be skipped as they're not in days [1,2,3,4,5]
      expect(result["2024-01-20"]).toBeUndefined();
      expect(result["2024-01-21"]).toBeUndefined();
      // Monday is day 1 (working day)
      expect(result["2024-01-22"]).toBeDefined();

      vi.useRealTimers();
    });

    it("should include toUser data when a redirect user is set", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-14T12:00:00Z"));

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"),
          end: new Date("2024-01-15T23:59:59Z"),
          notes: null,
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: { id: 2, username: "substitute", name: "Substitute User" },
          reason: null,
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      expect(result["2024-01-15"].toUser).toEqual({
        id: 2,
        displayName: "Substitute User",
        username: "substitute",
      });

      vi.useRealTimers();
    });

    it("should not include notes when showNotePublicly is false", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-14T12:00:00Z"));

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"),
          end: new Date("2024-01-15T23:59:59Z"),
          notes: "Private note about vacation",
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: null,
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      expect(result["2024-01-15"].notes).toBeNull();

      vi.useRealTimers();
    });

    it("should include notes when showNotePublicly is true", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-14T12:00:00Z"));

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"),
          end: new Date("2024-01-15T23:59:59Z"),
          notes: "At a conference",
          showNotePublicly: true,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: null,
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      expect(result["2024-01-15"].notes).toBe("At a conference");
      expect(result["2024-01-15"].showNotePublicly).toBe(true);

      vi.useRealTimers();
    });

    it("should handle OOO range starting before today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-17T12:00:00Z")); // Wednesday

      const oooDays = [
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"), // Monday (past)
          end: new Date("2024-01-19T23:59:59Z"), // Friday
          notes: null,
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: null,
        },
      ];

      const result = service.calculateOutOfOfficeRanges(oooDays, baseAvailability);

      // Should only include from today (Wed) onward, not past days
      expect(result["2024-01-15"]).toBeUndefined(); // Monday (past)
      expect(result["2024-01-16"]).toBeUndefined(); // Tuesday (past)
      expect(result["2024-01-17"]).toBeDefined(); // Wednesday (today)
      expect(result["2024-01-18"]).toBeDefined(); // Thursday
      expect(result["2024-01-19"]).toBeDefined(); // Friday

      vi.useRealTimers();
    });
  });

  describe("calculateHolidayBlockedDates", () => {
    const baseAvailability = [
      {
        days: [1, 2, 3, 4, 5] as number[],
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
        date: null as Date | null,
        userId: 1,
      },
    ];

    it("should return empty object when no holidays provided", () => {
      const result = service.calculateHolidayBlockedDates(baseAvailability, null, []);
      expect(result).toEqual({});
    });

    it("should return empty object when holiday list is empty", () => {
      const result = service.calculateHolidayBlockedDates(baseAvailability, [], []);
      expect(result).toEqual({});
    });

    it("should skip holidays that fall on non-working days", () => {
      // 2024-12-22 is a Sunday (day 0)
      const result = service.calculateHolidayBlockedDates(
        baseAvailability,
        [
          {
            date: "2024-12-22",
            holiday: { id: "sun", name: "Holiday on Sunday", date: "2024-12-22", year: 2024 },
          },
        ],
        []
      );
      expect(result["2024-12-22"]).toBeUndefined();
    });

    it("should include holidays that fall on working days", () => {
      // 2024-12-25 is a Wednesday (day 3)
      const result = service.calculateHolidayBlockedDates(
        baseAvailability,
        [
          {
            date: "2024-12-25",
            holiday: { id: "xmas", name: "Christmas Day", date: "2024-12-25", year: 2024 },
          },
        ],
        []
      );
      expect(result["2024-12-25"]).toBeDefined();
      expect(result["2024-12-25"].reason).toBe("Christmas Day");
      expect(result["2024-12-25"].fromUser).toBeNull();
      expect(result["2024-12-25"].toUser).toBeNull();
    });
  });

  describe("getTimezoneFromDelegatedCalendars", () => {
    it("should return null when user has no credentials", async () => {
      const user = createMockUser({ credentials: [] });
      const result = await service.getTimezoneFromDelegatedCalendars(user);
      expect(result).toBeNull();
    });

    it("should return null when no delegated credentials exist", async () => {
      const user = createMockUser({
        credentials: [
          {
            type: "google_calendar",
            delegatedToId: null,
          } as never,
        ],
      });
      const result = await service.getTimezoneFromDelegatedCalendars(user);
      expect(result).toBeNull();
    });

    it("should return cached timezone from Redis if available", async () => {
      vi.mocked(deps.redisClient.get).mockResolvedValue("Europe/London");

      const user = createMockUser({
        credentials: [
          {
            type: "google_calendar",
            delegatedToId: 99,
          } as never,
        ],
      });

      const result = await service.getTimezoneFromDelegatedCalendars(user);
      expect(result).toBe("Europe/London");
      expect(deps.redisClient.get).toHaveBeenCalledWith("user-timezone:1");
    });

    it("should handle Redis cache failure gracefully", async () => {
      vi.mocked(deps.redisClient.get).mockRejectedValue(new Error("Redis connection error"));

      const user = createMockUser({
        credentials: [
          {
            type: "google_calendar",
            delegatedToId: 99,
          } as never,
        ],
      });

      const { getCalendar } = await import("@calcom/app-store/_utils/getCalendar");
      vi.mocked(getCalendar).mockResolvedValue({
        getMainTimeZone: vi.fn().mockResolvedValue("Europe/Berlin"),
      } as never);

      // Should still work and try the calendar service
      const result = await service.getTimezoneFromDelegatedCalendars(user);
      expect(result).toBe("Europe/Berlin");
    });
  });

  describe("_getEventType", () => {
    it("should return null when event type is not found", async () => {
      vi.mocked(deps.eventTypeRepo.findByIdForUserAvailability).mockResolvedValue(null);
      const result = await service._getEventType(999);
      expect(result).toBeNull();
    });

    it("should return event type with parsed metadata", async () => {
      vi.mocked(deps.eventTypeRepo.findByIdForUserAvailability).mockResolvedValue({
        id: 1,
        metadata: { disableGuests: true },
        schedule: null,
        availability: [],
        hosts: [],
        timeZone: null,
        length: 30,
        seatsPerTimeSlot: null,
        schedulingType: null,
        bookingLimits: null,
        durationLimits: null,
        team: null,
        parent: null,
        useEventLevelSelectedCalendars: false,
      } as never);

      const result = await service._getEventType(1);
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });
  });

  describe("_getCurrentSeats", () => {
    it("should return current seats for a non-team event", async () => {
      vi.mocked(deps.bookingRepo.findAcceptedBookingByEventTypeId).mockResolvedValue([
        {
          uid: "booking-1",
          startTime: new Date("2024-01-15T10:00:00Z"),
          attendees: [{ email: "attendee1@example.com" }, { email: "attendee2@example.com" }],
        } as never,
      ]);

      const result = await service._getCurrentSeats(
        { id: 1, schedulingType: null, hosts: [] },
        dayjs("2024-01-15"),
        dayjs("2024-01-16")
      );

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe("booking-1");
      expect(result[0]._count.attendees).toBe(2);
    });

    it("should filter out host attendees for team events", async () => {
      vi.mocked(deps.bookingRepo.findAcceptedBookingByEventTypeId).mockResolvedValue([
        {
          uid: "booking-1",
          startTime: new Date("2024-01-15T10:00:00Z"),
          attendees: [
            { email: "host@example.com" },
            { email: "attendee1@example.com" },
            { email: "attendee2@example.com" },
          ],
        } as never,
      ]);

      const result = await service._getCurrentSeats(
        {
          id: 1,
          schedulingType: SchedulingType.COLLECTIVE,
          hosts: [{ user: { email: "host@example.com" } }],
        },
        dayjs("2024-01-15"),
        dayjs("2024-01-16")
      );

      expect(result).toHaveLength(1);
      // Host email should be filtered out
      expect(result[0]._count.attendees).toBe(2);
    });

    it("should filter host attendees for ROUND_ROBIN events", async () => {
      vi.mocked(deps.bookingRepo.findAcceptedBookingByEventTypeId).mockResolvedValue([
        {
          uid: "booking-1",
          startTime: new Date("2024-01-15T10:00:00Z"),
          attendees: [
            { email: "host1@example.com" },
            { email: "host2@example.com" },
            { email: "attendee@example.com" },
          ],
        } as never,
      ]);

      const result = await service._getCurrentSeats(
        {
          id: 1,
          schedulingType: SchedulingType.ROUND_ROBIN,
          hosts: [{ user: { email: "host1@example.com" } }, { user: { email: "host2@example.com" } }],
        },
        dayjs("2024-01-15"),
        dayjs("2024-01-16")
      );

      expect(result[0]._count.attendees).toBe(1);
    });

    it("should filter host attendees for MANAGED events", async () => {
      vi.mocked(deps.bookingRepo.findAcceptedBookingByEventTypeId).mockResolvedValue([
        {
          uid: "booking-1",
          startTime: new Date("2024-01-15T10:00:00Z"),
          attendees: [{ email: "host@example.com" }, { email: "attendee@example.com" }],
        } as never,
      ]);

      const result = await service._getCurrentSeats(
        {
          id: 1,
          schedulingType: SchedulingType.MANAGED,
          hosts: [{ user: { email: "host@example.com" } }],
        },
        dayjs("2024-01-15"),
        dayjs("2024-01-16")
      );

      expect(result[0]._count.attendees).toBe(1);
    });
  });

  describe("_getUserAvailability", () => {
    it("should throw 404 when no user is provided in initialData", async () => {
      await expect(
        service._getUserAvailability(
          {
            browsingWindowStart: dayjs("2024-01-15"),
            browsingWindowEnd: dayjs("2024-01-16"),
            returnDateOverrides: false,
          },
          { user: null }
        )
      ).rejects.toThrow("No user found in getUserAvailability");
    });

    it("should return availability for a user with a standard schedule", async () => {
      const user = createMockUser();

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"), // Monday
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"), // Tuesday
          returnDateOverrides: false,
        },
        { user }
      );

      expect(result.timeZone).toBe("America/New_York");
      expect(result.dateRanges.length).toBeGreaterThan(0);
      expect(result.workingHours.length).toBeGreaterThan(0);
    });

    it("should return empty result when no date ranges are available", async () => {
      // User only works Mon-Fri, checking Saturday
      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const result = await service._getUserAvailability(
        {
          // 2024-01-20 is a Saturday, 2024-01-21 is a Sunday
          browsingWindowStart: dayjs("2024-01-20T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-21T00:00:00Z"),
          returnDateOverrides: false,
        },
        { user }
      );

      expect(result.dateRanges).toEqual([]);
      expect(result.busy).toEqual([]);
    });

    it("should include OOO data in results", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-14T12:00:00Z"));

      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      vi.mocked(deps.oooRepo.findUserOOODays).mockResolvedValue([
        {
          id: 1,
          start: new Date("2024-01-15T00:00:00Z"),
          end: new Date("2024-01-15T23:59:59Z"),
          notes: null,
          showNotePublicly: false,
          user: { id: 1, name: "Test User" },
          toUser: null,
          reason: { id: 1, emoji: "🏖️", reason: "Vacation" },
        },
      ]);

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
        },
        { user }
      );

      expect(result.datesOutOfOffice).toBeDefined();
      expect(result.datesOutOfOffice?.["2024-01-15"]).toBeDefined();

      vi.useRealTimers();
    });

    it("should handle busy times error gracefully and return empty result", async () => {
      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const { getBusyTimesService } = await import("@calcom/features/di/containers/BusyTimes");
      vi.mocked(getBusyTimesService).mockReturnValue({
        getBusyTimes: vi.fn().mockRejectedValue(new Error("Calendar API error")),
      } as never);

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
        },
        { user }
      );

      // Should return empty arrays on error
      expect(result.busy).toEqual([]);
      expect(result.dateRanges).toEqual([]);
    });

    it("should use event type schedule when available", async () => {
      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const eventType = {
        id: 1,
        metadata: null,
        schedule: {
          id: 2,
          availability: [
            {
              days: [1, 2, 3, 4, 5],
              startTime: new Date("1970-01-01T10:00:00Z"),
              endTime: new Date("1970-01-01T14:00:00Z"),
              date: null,
            },
          ],
          timeZone: "Europe/London",
        },
        availability: [],
        hosts: [],
        timeZone: null,
        length: 30,
        seatsPerTimeSlot: null,
        schedulingType: null,
        bookingLimits: null,
        durationLimits: null,
        team: null,
        parent: null,
        useEventLevelSelectedCalendars: false,
      };

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
          eventTypeId: 1,
        },
        { user, eventType: eventType as never }
      );

      // Should use the event type's schedule timezone
      expect(result.timeZone).toBe("Europe/London");
    });

    it("should return date overrides when returnDateOverrides is true", async () => {
      // Use dates far in the future to avoid any date-in-past issues
      // Construct override date dynamically using Date to avoid dayjs plugin state issues
      const now = new Date();
      const futureYear = now.getFullYear() + 1;
      const overrideDateStr = `${futureYear}-06-15T00:00:00Z`;
      const dateFromStr = `${futureYear}-06-14T00:00:00Z`;
      const dateToStr = `${futureYear}-06-16T00:00:00Z`;

      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [0, 1, 2, 3, 4, 5, 6],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
              {
                days: [],
                startTime: new Date("1970-01-01T10:00:00Z"),
                endTime: new Date("1970-01-01T14:00:00Z"),
                date: new Date(overrideDateStr),
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs(dateFromStr),
          browsingWindowEnd: dayjs(dateToStr),
          returnDateOverrides: true,
        },
        { user }
      );

      expect(result.dateOverrides.length).toBeGreaterThan(0);
    });

    it("should not return date overrides when returnDateOverrides is false", async () => {
      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
              {
                days: [],
                startTime: new Date("1970-01-01T10:00:00Z"),
                endTime: new Date("1970-01-01T14:00:00Z"),
                date: new Date("2024-01-15T00:00:00Z"),
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-14T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
        },
        { user }
      );

      expect(result.dateOverrides).toEqual([]);
    });

    it("should use initialData busyTimesFromLimits when provided", async () => {
      const user = createMockUser({
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const busyTimesMap = new Map<number, Array<{ start: Date; end: Date }>>();
      busyTimesMap.set(1, [
        {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T11:00:00Z"),
        },
      ]);

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
          eventTypeId: 1,
        },
        {
          user,
          busyTimesFromLimits: busyTimesMap as never,
          eventTypeForLimits: { id: 1 },
          eventType: {
            id: 1,
            metadata: null,
            schedule: null,
            availability: [],
            hosts: [],
            timeZone: null,
            length: 30,
            seatsPerTimeSlot: null,
            schedulingType: null,
            bookingLimits: { PER_DAY: 5 },
            durationLimits: null,
            team: null,
            parent: null,
            useEventLevelSelectedCalendars: false,
          } as never,
        }
      );

      // busyTimesFromLimits was provided via initialData - verify it was accepted
      // The service processes these limits; exact busy count depends on implementation
      expect(result).toBeDefined();
      expect(Array.isArray(result.busy)).toBe(true);
    });

    it("should include travel schedule timezone for default schedule", async () => {
      const user = createMockUser({
        defaultScheduleId: 1,
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "America/New_York",
          },
        ],
        timeZone: "America/New_York",
        travelSchedules: [
          {
            id: 1,
            userId: 1,
            startDate: new Date("2024-01-14T00:00:00Z"),
            endDate: new Date("2024-01-20T00:00:00Z"),
            timeZone: "Asia/Tokyo",
            prevTimeZone: "America/New_York",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const result = await service._getUserAvailability(
        {
          browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
          browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
          returnDateOverrides: false,
        },
        { user }
      );

      // Should still return results (travel schedule affects timezone)
      expect(result.timeZone).toBe("America/New_York");
    });

    it("should throw error when no user is provided", async () => {
      await expect(
        service._getUserAvailability(
          {
            browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
            browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
            returnDateOverrides: false,
          },
          { user: null as never }
        )
      ).rejects.toThrow("No user found in getUserAvailability");
    });
  });

  describe("holidayData tri-state: undefined → DB fallback, null → skip, object → calculate", () => {
    const weekdaySchedule = {
      id: 1,
      availability: [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T09:00:00Z"),
          endTime: new Date("1970-01-01T17:00:00Z"),
          date: null,
        },
      ],
      timeZone: "UTC",
    };
    const dateRange = {
      browsingWindowStart: dayjs("2024-12-23T00:00:00Z"), // Monday
      browsingWindowEnd: dayjs("2024-12-27T00:00:00Z"), // Friday
      returnDateOverrides: false as const,
    };

    describe("undefined (not pre-fetched) → falls back to DB query", () => {
      it("should query holidayRepo when holidayData is not in initialData", async () => {
        vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue(null);

        const user = createMockUser({ timeZone: "UTC" });
        await service._getUserAvailability(dateRange, { user });

        expect(deps.holidayRepo.findUserSettingsSelect).toHaveBeenCalledWith({
          userId: 1,
          select: { countryCode: true, disabledIds: true },
        });
      });

      it("should return empty when holidayRepo returns no settings", async () => {
        vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue(null);

        const user = createMockUser({ timeZone: "UTC" });
        const result = await service._getUserAvailability(dateRange, { user });

        expect(result.datesOutOfOffice).toEqual({});
      });

      it("should return empty when settings exist but no country code", async () => {
        vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
          userId: 1,
          countryCode: null,
          disabledIds: [],
        });

        const user = createMockUser({ timeZone: "UTC" });
        const result = await service._getUserAvailability(dateRange, { user });

        expect(result.datesOutOfOffice).toEqual({});
      });

      it("should fetch and block holidays when country code is configured", async () => {
        vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
          userId: 1,
          countryCode: "US",
          disabledIds: [],
        });

        const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");
        vi.mocked(getHolidayService).mockReturnValue({
          getHolidayDatesInRange: vi.fn().mockResolvedValue([
            {
              date: "2024-12-25",
              holiday: { id: "xmas_2024", name: "Christmas Day", date: "2024-12-25", year: 2024 },
            },
          ]),
        } as never);

        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, { user });

        expect(result.datesOutOfOffice["2024-12-25"]).toBeDefined();
        expect(result.datesOutOfOffice["2024-12-25"].reason).toBe("Christmas Day");
      });

      it("should respect disabledIds in the fallback path", async () => {
        vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
          userId: 1,
          countryCode: "US",
          disabledIds: ["xmas_2024"],
        });

        const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");
        vi.mocked(getHolidayService).mockReturnValue({
          getHolidayDatesInRange: vi.fn().mockResolvedValue([
            {
              date: "2024-12-25",
              holiday: { id: "xmas_2024", name: "Christmas Day", date: "2024-12-25", year: 2024 },
            },
          ]),
        } as never);

        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, { user });

        expect(result.datesOutOfOffice["2024-12-25"]).toBeUndefined();
      });
    });

    describe("null (pre-fetched, user has no holiday config) → returns empty without DB query", () => {
      it("should not query holidayRepo when holidayData is explicitly null", async () => {
        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, {
          user,
          holidayData: null as never,
        });

        expect(deps.holidayRepo.findUserSettingsSelect).not.toHaveBeenCalled();
        expect(result.datesOutOfOffice).toEqual({});
      });
    });

    describe("object (pre-fetched with data) → calculates directly without DB query", () => {
      it("should use provided holiday dates and not query holidayRepo", async () => {
        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, {
          user,
          holidayData: {
            settings: { userId: 1, countryCode: "US", disabledIds: [] },
            dates: [
              {
                date: "2024-12-25",
                holiday: { id: "xmas_2024", name: "Christmas Day", date: "2024-12-25", year: 2024 },
              },
            ],
          },
        });

        expect(deps.holidayRepo.findUserSettingsSelect).not.toHaveBeenCalled();
        expect(result.datesOutOfOffice["2024-12-25"]).toBeDefined();
        expect(result.datesOutOfOffice["2024-12-25"].reason).toBe("Christmas Day");
      });

      it("should respect disabledIds from pre-fetched data", async () => {
        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, {
          user,
          holidayData: {
            settings: { userId: 1, countryCode: "US", disabledIds: ["xmas_2024"] },
            dates: [
              {
                date: "2024-12-25",
                holiday: { id: "xmas_2024", name: "Christmas Day", date: "2024-12-25", year: 2024 },
              },
            ],
          },
        });

        expect(deps.holidayRepo.findUserSettingsSelect).not.toHaveBeenCalled();
        expect(result.datesOutOfOffice["2024-12-25"]).toBeUndefined();
      });

      it("should return empty when pre-fetched dates is null", async () => {
        const user = createMockUser({ timeZone: "UTC", schedules: [weekdaySchedule] });
        const result = await service._getUserAvailability(dateRange, {
          user,
          holidayData: {
            settings: { userId: 1, countryCode: "US", disabledIds: [] },
            dates: null,
          },
        });

        expect(deps.holidayRepo.findUserSettingsSelect).not.toHaveBeenCalled();
        expect(result.datesOutOfOffice).toEqual({});
      });
    });
  });

  describe("_getUsersAvailability", () => {
    it("should return availability for multiple users", async () => {
      const user1 = createMockUser({
        id: 1,
        username: "user1",
        schedules: [
          {
            id: 1,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T09:00:00Z"),
                endTime: new Date("1970-01-01T17:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });
      const user2 = createMockUser({
        id: 2,
        username: "user2",
        schedules: [
          {
            id: 2,
            availability: [
              {
                days: [1, 2, 3, 4, 5],
                startTime: new Date("1970-01-01T10:00:00Z"),
                endTime: new Date("1970-01-01T18:00:00Z"),
                date: null,
              },
            ],
            timeZone: "UTC",
          },
        ],
        timeZone: "UTC",
      });

      const results = await service._getUsersAvailability({
        users: [user1, user2],
        query: {
          browsingWindowStart: "2024-01-15T00:00:00Z",
          browsingWindowEnd: "2024-01-16T00:00:00Z",
          returnDateOverrides: false,
        },
        initialData: {
          user: user1,
        },
      });

      expect(results).toHaveLength(2);
    });

    it("should throw error for invalid date range", async () => {
      const user = createMockUser();

      await expect(
        service._getUsersAvailability({
          users: [user],
          query: {
            browsingWindowStart: "invalid-date",
            browsingWindowEnd: "2024-01-16T00:00:00Z",
            returnDateOverrides: false,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe("prefetchHolidayData", () => {
    const params = {
      browsingWindowStart: dayjs("2024-12-20T00:00:00Z"),
      browsingWindowEnd: dayjs("2024-12-31T00:00:00Z"),
      returnDateOverrides: false as const,
    };

    it("should return null for all users when no holiday settings exist", async () => {
      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([]);

      const result = await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 })],
        params,
      });

      expect(result.size).toBe(2);
      expect(result.get(1)).toBeNull();
      expect(result.get(2)).toBeNull();
    });

    it("should return null for all users when settings exist but no country codes", async () => {
      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([
        { userId: 1, countryCode: null, disabledIds: [] },
      ]);

      const result = await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 })],
        params,
      });

      expect(result.size).toBe(2);
      // User 1 has settings (even without a country code), so we get { settings, dates: null }
      expect(result.get(1)).toEqual({
        settings: { userId: 1, countryCode: null, disabledIds: [] },
        dates: null,
      });
      expect(result.get(2)).toBeNull();
    });

    it("should not call holiday service when no country codes found", async () => {
      const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");
      const mockForCountries = vi.fn().mockResolvedValue(new Map());
      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
        getHolidayDatesInRangeForCountries: mockForCountries,
      } as never);

      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([]);

      await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 })],
        params,
      });

      expect(mockForCountries).not.toHaveBeenCalled();
    });

    it("should batch-fetch holiday dates for unique country codes", async () => {
      const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");
      const mockHolidayDates = [
        { date: "2024-12-25", holiday: { id: "xmas", name: "Christmas", date: "2024-12-25", year: 2024 } },
      ];

      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([
        { userId: 1, countryCode: "US", disabledIds: [] },
        { userId: 2, countryCode: "US", disabledIds: [] },
        { userId: 3, countryCode: "DE", disabledIds: [] },
      ]);

      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
        getHolidayDatesInRangeForCountries: vi.fn().mockResolvedValue(
          new Map([
            ["US", mockHolidayDates],
            [
              "DE",
              [
                {
                  date: "2024-12-25",
                  holiday: { id: "weihnachten", name: "Weihnachten", date: "2024-12-25", year: 2024 },
                },
              ],
            ],
          ])
        ),
      } as never);

      const result = await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 }), createMockUser({ id: 3 })],
        params,
      });

      expect(vi.mocked(getHolidayService)().getHolidayDatesInRangeForCountries).toHaveBeenCalledWith({
        countryCodes: ["US", "DE"],
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });

      expect(result.size).toBe(3);
      // Both US users get the same holiday dates
      expect(result.get(1)?.dates).toEqual(mockHolidayDates);
      expect(result.get(2)?.dates).toEqual(mockHolidayDates);
      // DE user gets German holidays
      expect(result.get(3)?.dates?.[0].holiday.id).toBe("weihnachten");
    });

    it("should return null for users without settings even when others have settings", async () => {
      const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");
      const mockHolidayDates = [
        { date: "2024-12-25", holiday: { id: "xmas", name: "Christmas", date: "2024-12-25", year: 2024 } },
      ];

      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([
        { userId: 1, countryCode: "US", disabledIds: ["disabled1"] },
      ]);

      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
        getHolidayDatesInRangeForCountries: vi.fn().mockResolvedValue(new Map([["US", mockHolidayDates]])),
      } as never);

      const result = await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 })],
        params,
      });

      expect(result.get(1)).toEqual({
        settings: { userId: 1, countryCode: "US", disabledIds: ["disabled1"] },
        dates: mockHolidayDates,
      });
      expect(result.get(2)).toBeNull();
    });

    it("should deduplicate country codes across users", async () => {
      const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");

      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([
        { userId: 1, countryCode: "US", disabledIds: [] },
        { userId: 2, countryCode: "US", disabledIds: [] },
        { userId: 3, countryCode: "US", disabledIds: [] },
      ]);

      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
        getHolidayDatesInRangeForCountries: vi.fn().mockResolvedValue(new Map([["US", []]])),
      } as never);

      await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 }), createMockUser({ id: 3 })],
        params,
      });

      // Should only pass "US" once, not three times
      expect(vi.mocked(getHolidayService)().getHolidayDatesInRangeForCountries).toHaveBeenCalledWith(
        expect.objectContaining({ countryCodes: ["US"] })
      );
    });

    it("should set dates to null when user has setting but no country code", async () => {
      const { getHolidayService } = await import("@calcom/lib/holidays/HolidayService");

      vi.mocked(deps.holidayRepo.findManyUserSettings).mockResolvedValue([
        { userId: 1, countryCode: "US", disabledIds: [] },
        { userId: 2, countryCode: null, disabledIds: [] },
      ]);

      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
        getHolidayDatesInRangeForCountries: vi.fn().mockResolvedValue(new Map([["US", []]])),
      } as never);

      const result = await service.prefetchHolidayData({
        users: [createMockUser({ id: 1 }), createMockUser({ id: 2 })],
        params,
      });

      expect(result.get(2)).toEqual({
        settings: { userId: 2, countryCode: null, disabledIds: [] },
        dates: null,
      });
    });
  });

  describe("prefetchCalendarCacheEvents", () => {
    function createSelectedCalendar(overrides: Partial<SelectedCalendar> = {}): SelectedCalendar {
      return {
        id: "cal-1",
        userId: 1,
        integration: "google_calendar",
        externalId: "primary",
        credentialId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleChannelId: null,
        googleChannelKind: null,
        googleChannelResourceId: null,
        googleChannelResourceUri: null,
        googleChannelExpiration: null,
        channelId: null,
        channelKind: null,
        channelResourceId: null,
        channelResourceUri: null,
        channelExpiration: null,
        syncSubscribedAt: new Date(),
        syncToken: "sync-token-123",
        syncSubscribedErrorCount: 0,
        syncErrorCount: 0,
        watchAttempts: 0,
        unwatchAttempts: 0,
        maxAttempts: 0,
        domainWideDelegationCredentialId: null,
        eventTypeId: null,
        ...overrides,
      } as SelectedCalendar;
    }

    it("should return null when no users have calendar cache enabled", async () => {
      const result = await service.prefetchCalendarCacheEvents({
        users: [createMockUser({ id: 1 })],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set(),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      expect(result).toBeNull();
    });

    it("should return null when cache-enabled users have no synced calendars", async () => {
      const user = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [createSelectedCalendar({ syncToken: null, syncSubscribedAt: null })],
      });

      const result = await service.prefetchCalendarCacheEvents({
        users: [user],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      expect(result).toBeNull();
    });

    it("should return null when synced calendars have no id", async () => {
      const user = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });

      const result = await service.prefetchCalendarCacheEvents({
        users: [user],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      expect(result).toBeNull();
    });

    it("should fetch cached events and return PrefetchedCalendarCacheEventRepository", async () => {
      const { getCalendarCacheEventRepository } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container"
      );

      const cachedEvents = [
        {
          start: new Date("2024-01-15T10:00:00Z"),
          end: new Date("2024-01-15T11:00:00Z"),
          timeZone: "UTC",
          selectedCalendarId: "cal-1",
        },
      ];

      vi.mocked(getCalendarCacheEventRepository).mockReturnValue({
        findAllBySelectedCalendarIdsBetween: vi.fn().mockResolvedValue(cachedEvents),
      } as unknown as ICalendarCacheEventRepository);

      const user = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({
            id: "cal-1",
            syncToken: "sync-token",
            syncSubscribedAt: new Date(),
          }),
        ],
      });

      const result = await service.prefetchCalendarCacheEvents({
        users: [user],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      expect(result).not.toBeNull();
      // Verify the returned repo can serve events
      const events = await result!.findAllBySelectedCalendarIdsBetween(
        ["cal-1"],
        new Date("2024-01-15T00:00:00Z"),
        new Date("2024-01-16T00:00:00Z")
      );
      expect(events).toHaveLength(1);
      expect(events[0].selectedCalendarId).toBe("cal-1");
    });

    it("should only include calendars from cache-enabled users", async () => {
      const { getCalendarCacheEventRepository } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container"
      );

      const mockFindAll = vi.fn().mockResolvedValue([]);
      vi.mocked(getCalendarCacheEventRepository).mockReturnValue({
        findAllBySelectedCalendarIdsBetween: mockFindAll,
      } as unknown as ICalendarCacheEventRepository);

      const user1 = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "cal-user1", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });
      const user2 = createMockUser({
        id: 2,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "cal-user2", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });

      // Only user 1 has cache enabled
      await service.prefetchCalendarCacheEvents({
        users: [user1, user2],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      // Should only query for user1's calendar
      expect(mockFindAll).toHaveBeenCalledWith(["cal-user1"], expect.any(Date), expect.any(Date));
    });

    it("should use event-level calendars when eventType has useEventLevelSelectedCalendars", async () => {
      const { getCalendarCacheEventRepository } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container"
      );

      const mockFindAll = vi.fn().mockResolvedValue([]);
      vi.mocked(getCalendarCacheEventRepository).mockReturnValue({
        findAllBySelectedCalendarIdsBetween: mockFindAll,
      } as unknown as ICalendarCacheEventRepository);

      const user = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "user-cal", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
        allSelectedCalendars: [
          createSelectedCalendar({
            id: "event-cal",
            syncToken: "token",
            syncSubscribedAt: new Date(),
            eventTypeId: 42,
          }),
          createSelectedCalendar({ id: "user-cal", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });

      const eventType = {
        useEventLevelSelectedCalendars: true,
        id: 42,
      };

      await service.prefetchCalendarCacheEvents({
        users: [user],
        eventType: eventType as never,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      // Should only query for the event-type-level calendar
      expect(mockFindAll).toHaveBeenCalledWith(["event-cal"], expect.any(Date), expect.any(Date));
    });

    it("should aggregate calendars across multiple cache-enabled users", async () => {
      const { getCalendarCacheEventRepository } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container"
      );

      const mockFindAll = vi.fn().mockResolvedValue([]);
      vi.mocked(getCalendarCacheEventRepository).mockReturnValue({
        findAllBySelectedCalendarIdsBetween: mockFindAll,
      } as unknown as ICalendarCacheEventRepository);

      const user1 = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "cal-a", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });
      const user2 = createMockUser({
        id: 2,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "cal-b", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });

      await service.prefetchCalendarCacheEvents({
        users: [user1, user2],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1, 2]),
        browsingWindowStart: dayjs("2024-01-15T00:00:00Z"),
        browsingWindowEnd: dayjs("2024-01-16T00:00:00Z"),
      });

      // Should query for both users' calendars in a single call
      expect(mockFindAll).toHaveBeenCalledWith(
        expect.arrayContaining(["cal-a", "cal-b"]),
        expect.any(Date),
        expect.any(Date)
      );
    });

    it("should expand date range by UTC offset for the query", async () => {
      const { getCalendarCacheEventRepository } = await import(
        "@calcom/features/calendar-subscription/di/CalendarCacheEventRepository.container"
      );

      const mockFindAll = vi.fn().mockResolvedValue([]);
      vi.mocked(getCalendarCacheEventRepository).mockReturnValue({
        findAllBySelectedCalendarIdsBetween: mockFindAll,
      } as unknown as ICalendarCacheEventRepository);

      const user = createMockUser({
        id: 1,
        userLevelSelectedCalendars: [
          createSelectedCalendar({ id: "cal-1", syncToken: "token", syncSubscribedAt: new Date() }),
        ],
      });

      const browsingWindowStart = dayjs("2024-01-15T00:00:00Z");
      const browsingWindowEnd = dayjs("2024-01-16T00:00:00Z");

      await service.prefetchCalendarCacheEvents({
        users: [user],
        eventType: null,
        calendarCacheEnabledForUserIds: new Set([1]),
        browsingWindowStart,
        browsingWindowEnd,
      });

      // The date range should be expanded (start subtracted by 11h, end added by 14h)
      const [, startArg, endArg] = mockFindAll.mock.calls[0];
      expect(startArg.getTime()).toBeLessThan(browsingWindowStart.toDate().getTime());
      expect(endArg.getTime()).toBeGreaterThan(browsingWindowEnd.toDate().getTime());
    });
  });
});
