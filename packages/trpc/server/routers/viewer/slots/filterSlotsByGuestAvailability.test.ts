import { describe, it, expect, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";

import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

function createMockDependencies(overrides: Partial<IAvailableSlotsService> = {}): IAvailableSlotsService {
  return {
    oooRepo: {} as any,
    scheduleRepo: {} as any,
    selectedSlotRepo: {} as any,
    teamRepo: {} as any,
    userRepo: { findByEmail: vi.fn().mockResolvedValue(null) } as any,
    bookingRepo: {
      findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue(null),
    } as any,
    eventTypeRepo: {} as any,
    routingFormResponseRepo: {} as any,
    checkBookingLimitsService: {} as any,
    userAvailabilityService: {
      getUsersAvailability: vi.fn().mockResolvedValue([]),
    } as any,
    busyTimesService: {} as any,
    redisClient: {} as any,
    featuresRepo: {} as any,
    qualifiedHostsService: {} as any,
    noSlotsNotificationService: {} as any,
    orgMembershipLookup: {} as any,
    ...overrides,
  };
}

function createSlot(isoTime: string) {
  return { time: dayjs.utc(isoTime) };
}

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
} as any;

describe("filterSlotsByGuestAvailability", () => {
  let service: AvailableSlotsService;
  let deps: IAvailableSlotsService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all slots when there is no reschedule booking", async () => {
    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue(null),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z"), createSlot("2026-04-01T11:00:00Z")];

    // Access private method via bracket notation
    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(2);
  });

  it("should return all slots when booking has no attendees", async () => {
    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [],
        }),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z")];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(1);
  });

  it("should return all slots when guest is not a Cal.com user", async () => {
    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [{ email: "external-guest@gmail.com", name: "Guest" }],
        }),
      } as any,
      userRepo: {
        findByEmail: vi.fn().mockResolvedValue(null),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z"), createSlot("2026-04-01T11:00:00Z")];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(2);
  });

  it("should filter out slots that conflict with a Cal.com guest's busy times", async () => {
    const guestUser = {
      id: 2,
      email: "guest@cal.com",
      username: "guest",
      bufferTime: 0,
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: 1,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      selectedCalendars: [],
      travelSchedules: [],
    };

    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [{ email: "guest@cal.com", name: "Guest" }],
        }),
      } as any,
      userRepo: {
        findByEmail: vi.fn().mockResolvedValue(guestUser),
      } as any,
      userAvailabilityService: {
        getUsersAvailability: vi.fn().mockResolvedValue([
          {
            busy: [
              {
                start: new Date("2026-04-01T10:00:00Z"),
                end: new Date("2026-04-01T10:30:00Z"),
              },
            ],
            dateRanges: [],
            oooExcludedDateRanges: [],
            timeZone: "UTC",
            workingHours: [],
            dateOverrides: [],
            currentSeats: null,
          },
        ]),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [
      createSlot("2026-04-01T10:00:00Z"), // conflicts with guest busy
      createSlot("2026-04-01T11:00:00Z"), // free
      createSlot("2026-04-01T12:00:00Z"), // free
    ];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(2);
    expect(result[0].time.toISOString()).toBe("2026-04-01T11:00:00Z");
    expect(result[1].time.toISOString()).toBe("2026-04-01T12:00:00Z");
  });

  it("should filter slots against multiple Cal.com guests' busy times", async () => {
    const makeGuestUser = (id: number, email: string) => ({
      id,
      email,
      username: email.split("@")[0],
      bufferTime: 0,
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: 1,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      selectedCalendars: [],
      travelSchedules: [],
    });

    const findByEmailMock = vi.fn().mockImplementation(({ email }: { email: string }) => {
      if (email === "guest1@cal.com") return Promise.resolve(makeGuestUser(2, "guest1@cal.com"));
      if (email === "guest2@cal.com") return Promise.resolve(makeGuestUser(3, "guest2@cal.com"));
      return Promise.resolve(null);
    });

    const getUsersAvailabilityMock = vi.fn();
    // First call for guest1 — busy at 10:00
    getUsersAvailabilityMock.mockResolvedValueOnce([
      {
        busy: [{ start: new Date("2026-04-01T10:00:00Z"), end: new Date("2026-04-01T10:30:00Z") }],
        dateRanges: [],
        oooExcludedDateRanges: [],
        timeZone: "UTC",
        workingHours: [],
        dateOverrides: [],
        currentSeats: null,
      },
    ]);
    // Second call for guest2 — busy at 11:00
    getUsersAvailabilityMock.mockResolvedValueOnce([
      {
        busy: [{ start: new Date("2026-04-01T11:00:00Z"), end: new Date("2026-04-01T11:30:00Z") }],
        dateRanges: [],
        oooExcludedDateRanges: [],
        timeZone: "UTC",
        workingHours: [],
        dateOverrides: [],
        currentSeats: null,
      },
    ]);

    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [
            { email: "guest1@cal.com", name: "Guest 1" },
            { email: "guest2@cal.com", name: "Guest 2" },
          ],
        }),
      } as any,
      userRepo: { findByEmail: findByEmailMock } as any,
      userAvailabilityService: { getUsersAvailability: getUsersAvailabilityMock } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [
      createSlot("2026-04-01T10:00:00Z"), // guest1 busy
      createSlot("2026-04-01T11:00:00Z"), // guest2 busy
      createSlot("2026-04-01T12:00:00Z"), // both free
    ];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(1);
    expect(result[0].time.toISOString()).toBe("2026-04-01T12:00:00Z");
  });

  it("should skip the host's email when checking attendees", async () => {
    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [
            { email: "host@example.com", name: "Host" }, // host is also in attendees
          ],
        }),
      } as any,
      userRepo: { findByEmail: vi.fn() } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z")];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    // Should not have called findByEmail since the only attendee is the host
    expect(deps.userRepo.findByEmail).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("should gracefully fall back to all slots on error", async () => {
    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockRejectedValue(new Error("DB error")),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z"), createSlot("2026-04-01T11:00:00Z")];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    // Should return all slots (graceful fallback)
    expect(result).toHaveLength(2);
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("should return all slots when guest has no busy times", async () => {
    const guestUser = {
      id: 2,
      email: "guest@cal.com",
      username: "guest",
      bufferTime: 0,
      timeZone: "UTC",
      timeFormat: 24,
      defaultScheduleId: null,
      isPlatformManaged: false,
      availability: [],
      schedules: [],
      selectedCalendars: [],
      travelSchedules: [],
    };

    deps = createMockDependencies({
      bookingRepo: {
        findByUidIncludeEventTypeAndReferences: vi.fn().mockResolvedValue({
          user: { id: 1, email: "host@example.com" },
          attendees: [{ email: "guest@cal.com", name: "Guest" }],
        }),
      } as any,
      userRepo: { findByEmail: vi.fn().mockResolvedValue(guestUser) } as any,
      userAvailabilityService: {
        getUsersAvailability: vi.fn().mockResolvedValue([
          {
            busy: [],
            dateRanges: [],
            oooExcludedDateRanges: [],
            timeZone: "UTC",
            workingHours: [],
            dateOverrides: [],
            currentSeats: null,
          },
        ]),
      } as any,
    });
    service = new AvailableSlotsService(deps);

    const slots = [createSlot("2026-04-01T10:00:00Z"), createSlot("2026-04-01T11:00:00Z")];

    const result = await (service as any).filterSlotsByGuestAvailability({
      availableTimeSlots: slots,
      rescheduleUid: "test-uid",
      startTime: dayjs.utc("2026-04-01T00:00:00Z"),
      endTime: dayjs.utc("2026-04-02T00:00:00Z"),
      eventLength: 30,
      mode: "slots",
      loggerWithEventDetails: mockLogger,
    });

    expect(result).toHaveLength(2);
  });
});
