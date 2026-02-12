import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GetUserAvailabilityInitialData } from "./getUserAvailability";
import { UserAvailabilityService } from "./getUserAvailability";

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: vi.fn(() => mockBusyTimesService),
}));

vi.mock("@calcom/features/busyTimes/lib/getBusyTimesFromLimits", () => ({
  getBusyTimesFromLimits: vi.fn().mockResolvedValue([]),
  getBusyTimesFromTeamLimits: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/app-store/_utils/getCalendar", () => ({
  getCalendar: vi.fn(),
}));

vi.mock("@calcom/lib/holidays", () => ({
  getHolidayService: vi.fn(() => ({
    getHolidayDatesInRange: vi.fn().mockResolvedValue([]),
  })),
}));

const mockBusyTimesService = {
  getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
    limitDateFrom: dayjs("2025-01-01T00:00:00Z"),
    limitDateTo: dayjs("2025-01-31T23:59:59Z"),
  }),
  getBusyTimesForLimitChecks: vi.fn().mockResolvedValue([]),
  getBusyTimes: vi.fn().mockResolvedValue([]),
};

const mockDependencies = {
  oooRepo: {
    findUserOOODays: vi.fn().mockResolvedValue([]),
  } as never,
  bookingRepo: {} as never,
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  } as never,
  eventTypeRepo: {
    findByIdForUserAvailability: vi.fn().mockResolvedValue(null),
  } as never,
  holidayRepo: {
    findUserSettingsSelect: vi.fn().mockResolvedValue(null),
  } as never,
};

const createMockUser = (overrides?: Partial<NonNullable<GetUserAvailabilityInitialData["user"]>>) => ({
  id: 1,
  username: "testuser",
  email: "test@example.com",
  bufferTime: 0,
  timeZone: "UTC",
  availability: [
    {
      id: 1,
      userId: 1,
      eventTypeId: null,
      scheduleId: 1,
      days: [1, 2, 3, 4, 5],
      startTime: new Date("1970-01-01T09:00:00Z"),
      endTime: new Date("1970-01-01T17:00:00Z"),
      date: null,
    },
  ],
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
      timeZone: "UTC",
    },
  ],
  credentials: [],
  allSelectedCalendars: [],
  userLevelSelectedCalendars: [],
  travelSchedules: [],
  ...overrides,
});

const createMockEventType = (overrides?: Record<string, unknown>) => ({
  id: 100,
  slug: "test-event",
  title: "Test Event",
  length: 30,
  seatsPerTimeSlot: null,
  timeZone: null,
  schedule: null,
  availability: [],
  hosts: [],
  bookingLimits: null,
  durationLimits: null,
  metadata: null,
  useEventLevelSelectedCalendars: false,
  team: null,
  parent: null,
  schedulingType: null,
  ...overrides,
});

const createParams = (overrides?: Record<string, unknown>) => ({
  dateFrom: dayjs("2025-01-06T00:00:00Z"),
  dateTo: dayjs("2025-01-10T23:59:59Z"),
  returnDateOverrides: false,
  ...overrides,
});

describe("UserAvailabilityService.getUserAvailabilityIncludingBusyTimesFromLimits", () => {
  let service: UserAvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserAvailabilityService(mockDependencies);
  });

  it("skips fetching limit busy times when busyTimesFromLimitsBookings is already in initialData", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });
    const existingBusyTimes: EventBusyDetails[] = [
      {
        start: "2025-01-06T10:00:00Z",
        end: "2025-01-06T23:59:59Z",
        source: "Event Booking Limit",
      },
    ];

    const result = await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
      busyTimesFromLimitsBookings: existingBusyTimes,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.busy).toBeDefined();
  });

  it("fetches busy times from limits when eventType has booking limits and no initialData busyTimesFromLimitsBookings", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams({ eventTypeId: 100 }), {
      user,
      eventType: eventType as never,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).toHaveBeenCalledWith(
      "2025-01-06T00:00:00.000Z",
      "2025-01-10T23:59:59.000Z",
      expect.objectContaining({ PER_DAY: 3 })
    );
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [user.id],
        eventTypeId: 100,
        bookingLimits: expect.objectContaining({ PER_DAY: 3 }),
      })
    );
  });

  it("fetches busy times from limits when eventType has duration limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ durationLimits: { PER_WEEK: 120 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ PER_WEEK: 120 })
    );
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [user.id],
        durationLimits: expect.objectContaining({ PER_WEEK: 120 }),
      })
    );
  });

  it("still calls getBusyTimesForLimitChecks when eventType exists but has no limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType();

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingLimits: null,
        durationLimits: null,
        eventTypeId: 100,
      })
    );
  });

  it("skips fetching limit busy times when no eventType exists", async () => {
    const user = createMockUser();

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).not.toHaveBeenCalled();
  });

  it("uses host user IDs for team events with booking limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({
      bookingLimits: { PER_DAY: 5 },
      hosts: [{ user: { id: 1 } }, { user: { id: 2 } }, { user: { id: 3 } }],
    });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [1, 2, 3],
      })
    );
  });

  it("uses only the user ID for solo events with booking limits", async () => {
    const user = createMockUser({ id: 42 });
    const eventType = createMockEventType({
      bookingLimits: { PER_DAY: 2 },
      hosts: [],
    });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [42],
      })
    );
  });

  it("fetches eventType by eventTypeId when not provided in initialData", async () => {
    const user = createMockUser();
    const fetchedEventType = createMockEventType({ bookingLimits: { PER_DAY: 1 } });

    mockDependencies.eventTypeRepo.findByIdForUserAvailability.mockResolvedValueOnce(fetchedEventType);

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams({ eventTypeId: 100 }), {
      user,
    });

    expect(mockDependencies.eventTypeRepo.findByIdForUserAvailability).toHaveBeenCalledWith({ id: 100 });
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTypeId: 100,
        bookingLimits: expect.objectContaining({ PER_DAY: 1 }),
      })
    );
  });

  it("passes fetched busyTimesFromLimitsBookings to _getUserAvailability", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });
    const fetchedBusyTimes: EventBusyDetails[] = [
      {
        start: "2025-01-06T09:00:00Z",
        end: "2025-01-06T10:00:00Z",
        source: "eventType-100-booking-1",
        title: "Test Booking",
      },
    ];

    mockBusyTimesService.getBusyTimesForLimitChecks.mockResolvedValueOnce(fetchedBusyTimes);

    const getUserAvailabilitySpy = vi.spyOn(service, "_getUserAvailability" as never);

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
    });

    expect(getUserAvailabilitySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        busyTimesFromLimitsBookings: fetchedBusyTimes,
      })
    );
  });

  it("passes rescheduleUid to getBusyTimesForLimitChecks when provided", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType: eventType as never,
      rescheduleUid: "reschedule-uid-123",
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith(
      expect.objectContaining({
        rescheduleUid: "reschedule-uid-123",
      })
    );
  });
});
