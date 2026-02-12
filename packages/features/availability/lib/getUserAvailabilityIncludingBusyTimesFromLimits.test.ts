import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventType, GetUserAvailabilityInitialData } from "./getUserAvailability";
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

const mockDependencies: ConstructorParameters<typeof UserAvailabilityService>[0] = {
  oooRepo: {
    findUserOOODays: vi.fn().mockResolvedValue([]),
  },
  bookingRepo: {
    findAcceptedBookingByEventTypeId: vi.fn().mockResolvedValue([]),
  },
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
  },
  eventTypeRepo: {
    findByIdForUserAvailability: vi.fn().mockResolvedValue(null),
    findForSlots: vi.fn().mockResolvedValue(null),
  },
  holidayRepo: {
    findUserSettingsSelect: vi.fn().mockResolvedValue(null),
  },
};

const DATE_FROM = "2025-01-06T00:00:00Z";
const DATE_TO = "2025-01-10T23:59:59Z";
const DATE_FROM_ISO = "2025-01-06T00:00:00.000Z";
const DATE_TO_ISO = "2025-01-10T23:59:59.000Z";
const LIMIT_DATE_FROM_FORMATTED = "2025-01-01T00:00:00+00:00";
const LIMIT_DATE_TO_FORMATTED = "2025-01-31T23:59:59+00:00";

const createMockUser = (
  overrides?: Partial<NonNullable<GetUserAvailabilityInitialData["user"]>>
): NonNullable<GetUserAvailabilityInitialData["user"]> => ({
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

const createMockEventType = (overrides?: Partial<NonNullable<EventType>>): NonNullable<EventType> => ({
  id: 100,
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
  assignAllTeamMembers: false,
  ...overrides,
});

const createParams = (overrides?: Record<string, unknown>) => ({
  dateFrom: dayjs(DATE_FROM),
  dateTo: dayjs(DATE_TO),
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
      eventType,
      busyTimesFromLimitsBookings: existingBusyTimes,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).not.toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.busy).toBeDefined();
  });

  it("fetches busy times when eventType has booking limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams({ eventTypeId: 100 }), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).toHaveBeenCalledWith(
      DATE_FROM_ISO,
      DATE_TO_ISO,
      { PER_DAY: 3 },
      null
    );
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [1],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: undefined,
      bookingLimits: { PER_DAY: 3 },
      durationLimits: null,
    });
  });

  it("fetches busy times when eventType has duration limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ durationLimits: { PER_WEEK: 120 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).toHaveBeenCalledWith(
      DATE_FROM_ISO,
      DATE_TO_ISO,
      null,
      { PER_WEEK: 120 }
    );
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [1],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: undefined,
      bookingLimits: null,
      durationLimits: { PER_WEEK: 120 },
    });
  });

  it("passes both bookingLimits and durationLimits separately to getStartEndDateforLimitCheck", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({
      bookingLimits: { PER_DAY: 3 },
      durationLimits: { PER_WEEK: 120 },
    });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).toHaveBeenCalledWith(
      DATE_FROM_ISO,
      DATE_TO_ISO,
      { PER_DAY: 3 },
      { PER_WEEK: 120 }
    );
  });

  it("skips fetching limit busy times when eventType has no limits", async () => {
    const user = createMockUser();
    const eventType = createMockEventType();

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getStartEndDateforLimitCheck).not.toHaveBeenCalled();
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).not.toHaveBeenCalled();
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
      hosts: [
        { user: { id: 1, email: "host1@test.com" }, schedule: null },
        { user: { id: 2, email: "host2@test.com" }, schedule: null },
        { user: { id: 3, email: "host3@test.com" }, schedule: null },
      ],
    });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [1, 2, 3],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: undefined,
      bookingLimits: { PER_DAY: 5 },
      durationLimits: null,
    });
  });

  it("uses only the user ID for solo events with booking limits", async () => {
    const user = createMockUser({ id: 42 });
    const eventType = createMockEventType({
      bookingLimits: { PER_DAY: 2 },
      hosts: [],
    });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [42],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: undefined,
      bookingLimits: { PER_DAY: 2 },
      durationLimits: null,
    });
  });

  it("fetches eventType by eventTypeId when not provided in initialData", async () => {
    const user = createMockUser();
    const fetchedEventType = createMockEventType({ bookingLimits: { PER_DAY: 1 } });

    vi.mocked(mockDependencies.eventTypeRepo.findByIdForUserAvailability).mockResolvedValueOnce(
      fetchedEventType
    );

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams({ eventTypeId: 100 }), {
      user,
    });

    expect(mockDependencies.eventTypeRepo.findByIdForUserAvailability).toHaveBeenCalledWith({ id: 100 });
    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [1],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: undefined,
      bookingLimits: { PER_DAY: 1 },
      durationLimits: null,
    });
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

    const getUserAvailabilitySpy = vi.spyOn(service, "_getUserAvailability" as keyof typeof service);

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
    });

    expect(getUserAvailabilitySpy).toHaveBeenCalledWith(
      createParams(),
      {
        user,
        eventType,
        busyTimesFromLimitsBookings: fetchedBusyTimes,
      }
    );
  });

  it("passes rescheduleUid to getBusyTimesForLimitChecks when provided", async () => {
    const user = createMockUser();
    const eventType = createMockEventType({ bookingLimits: { PER_DAY: 3 } });

    await service.getUserAvailabilityIncludingBusyTimesFromLimits(createParams(), {
      user,
      eventType,
      rescheduleUid: "reschedule-uid-123",
    });

    expect(mockBusyTimesService.getBusyTimesForLimitChecks).toHaveBeenCalledWith({
      userIds: [1],
      eventTypeId: 100,
      startDate: LIMIT_DATE_FROM_FORMATTED,
      endDate: LIMIT_DATE_TO_FORMATTED,
      rescheduleUid: "reschedule-uid-123",
      bookingLimits: { PER_DAY: 3 },
      durationLimits: null,
    });
  });
});
