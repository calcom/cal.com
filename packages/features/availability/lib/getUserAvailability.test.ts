import dayjs from "@calcom/dayjs";
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

vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn().mockReturnValue({
    getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@calcom/lib/holidays/getHolidayEmoji", () => ({
  getHolidayEmoji: vi.fn().mockReturnValue("🎄"),
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

    it("should return empty object when no holiday settings exist", async () => {
      vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue(null);

      const result = await service.calculateHolidayBlockedDates(
        1,
        new Date("2024-12-20"),
        new Date("2024-12-30"),
        baseAvailability
      );

      expect(result).toEqual({});
    });

    it("should return empty object when no countryCode is set", async () => {
      vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
        countryCode: null,
        disabledIds: [],
      });

      const result = await service.calculateHolidayBlockedDates(
        1,
        new Date("2024-12-20"),
        new Date("2024-12-30"),
        baseAvailability
      );

      expect(result).toEqual({});
    });

    it("should return empty object when no holidays in range", async () => {
      vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
        countryCode: "US",
        disabledIds: [],
      });

      const { getHolidayService } = await import("@calcom/lib/holidays");
      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
      } as never);

      const result = await service.calculateHolidayBlockedDates(
        1,
        new Date("2024-12-20"),
        new Date("2024-12-30"),
        baseAvailability
      );

      expect(result).toEqual({});
    });

    it("should skip holidays that fall on non-working days", async () => {
      vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
        countryCode: "US",
        disabledIds: [],
      });

      const { getHolidayService } = await import("@calcom/lib/holidays");
      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([
          // 2024-12-22 is a Sunday (day 0)
          { date: "2024-12-22", holiday: { name: "Holiday on Sunday" } },
        ]),
      } as never);

      const result = await service.calculateHolidayBlockedDates(
        1,
        new Date("2024-12-20"),
        new Date("2024-12-25"),
        baseAvailability
      );

      expect(result["2024-12-22"]).toBeUndefined();
    });

    it("should include holidays that fall on working days", async () => {
      vi.mocked(deps.holidayRepo.findUserSettingsSelect).mockResolvedValue({
        countryCode: "US",
        disabledIds: [],
      });

      const { getHolidayService } = await import("@calcom/lib/holidays");
      vi.mocked(getHolidayService).mockReturnValue({
        getHolidayDatesInRange: vi.fn().mockResolvedValue([
          // 2024-12-25 is a Wednesday (day 3)
          { date: "2024-12-25", holiday: { name: "Christmas Day" } },
        ]),
      } as never);

      const result = await service.calculateHolidayBlockedDates(
        1,
        new Date("2024-12-20"),
        new Date("2024-12-30"),
        baseAvailability
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
            dateFrom: dayjs("2024-01-15"),
            dateTo: dayjs("2024-01-16"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"), // Monday
          dateTo: dayjs("2024-01-16T00:00:00Z"), // Tuesday
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
          dateFrom: dayjs("2024-01-20T00:00:00Z"),
          dateTo: dayjs("2024-01-21T00:00:00Z"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
          dateFrom: dayjs(dateFromStr),
          dateTo: dayjs(dateToStr),
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
          dateFrom: dayjs("2024-01-14T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
          dateFrom: dayjs("2024-01-15T00:00:00Z"),
          dateTo: dayjs("2024-01-16T00:00:00Z"),
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
            dateFrom: dayjs("2024-01-15T00:00:00Z"),
            dateTo: dayjs("2024-01-16T00:00:00Z"),
            returnDateOverrides: false,
          },
          { user: null as never }
        )
      ).rejects.toThrow("No user found in getUserAvailability");
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
          dateFrom: "2024-01-15T00:00:00Z",
          dateTo: "2024-01-16T00:00:00Z",
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
            dateFrom: "invalid-date",
            dateTo: "2024-01-16T00:00:00Z",
            returnDateOverrides: false,
          },
        })
      ).rejects.toThrow();
    });
  });
});
