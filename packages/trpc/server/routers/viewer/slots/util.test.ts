import dayjs from "@calcom/dayjs";
import type {
  GetAvailabilityUser,
  GetUserAvailabilityResult,
} from "@calcom/features/availability/lib/getUserAvailability";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IAvailableSlotsService } from "./util";
import { AvailableSlotsService } from "./util";

function createMockUser(
  overrides?: Partial<NonNullable<GetAvailabilityUser>>
): NonNullable<GetAvailabilityUser> {
  return {
    isFixed: false,
    groupId: null,
    username: "test-user",
    id: 1,
    email: "test-user@example.com",
    bufferTime: 0,
    timeZone: "UTC",
    availability: [],
    timeFormat: 12,
    defaultScheduleId: 1,
    isPlatformManaged: false,
    schedules: [],
    credentials: [],
    allSelectedCalendars: [],
    userLevelSelectedCalendars: [],
    travelSchedules: [],
    ...overrides,
  };
}

function createAvailabilityResult(): GetUserAvailabilityResult {
  return {
    busy: [],
    timeZone: "UTC",
    dateRanges: [],
    oooExcludedDateRanges: [],
    workingHours: [],
    dateOverrides: [],
    currentSeats: null,
    datesOutOfOffice: {},
  };
}

describe("AvailableSlotsService.calculateHostsAndAvailabilities", () => {
  type CalculateHostsAndAvailabilities =
    typeof AvailableSlotsService.prototype.calculateHostsAndAvailabilities;

  let service: AvailableSlotsService;
  let mockDependencies: {
    bookingRepo: {
      findAllExistingBookingsForEventTypeBetween: ReturnType<typeof vi.fn>;
    };
    oooRepo: {
      findManyOOO: ReturnType<typeof vi.fn>;
    };
    busyTimesService: {
      getBusyTimesForLimitChecks: ReturnType<typeof vi.fn>;
    };
    userAvailabilityService: {
      getUsersAvailability: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDependencies = {
      bookingRepo: {
        findAllExistingBookingsForEventTypeBetween: vi.fn(),
      },
      oooRepo: {
        findManyOOO: vi.fn(),
      },
      busyTimesService: {
        getBusyTimesForLimitChecks: vi.fn(),
      },
      userAvailabilityService: {
        getUsersAvailability: vi.fn(),
      },
    };

    service = new AvailableSlotsService(mockDependencies as unknown as IAvailableSlotsService);
  });

  it("passes the right bookings and OOO days to each user without leaking attendee payloads", async () => {
    const firstUser = createMockUser({
      id: 29,
      email: "host-1@example.com",
      username: "host-1",
    });
    const secondUser = createMockUser({
      id: 31,
      email: "host-2@example.com",
      username: "host-2",
    });

    mockDependencies.bookingRepo.findAllExistingBookingsForEventTypeBetween.mockResolvedValue([
      {
        id: 101,
        uid: "booking-for-host-1",
        userId: 29,
        startTime: new Date("2026-01-05T09:00:00.000Z"),
        endTime: new Date("2026-01-05T09:30:00.000Z"),
        title: "Organizer booking",
        attendees: [{ email: "host-1@example.com" }, { email: "guest@example.com" }],
        eventType: null,
      },
      {
        id: 102,
        uid: "booking-where-host-1-is-an-attendee",
        userId: 99,
        startTime: new Date("2026-01-05T10:00:00.000Z"),
        endTime: new Date("2026-01-05T10:30:00.000Z"),
        title: "Attendee booking",
        attendees: [{ email: "host-1@example.com" }, { email: "host-1@example.com" }],
        eventType: null,
      },
      {
        id: 103,
        uid: "booking-for-host-2",
        userId: 31,
        startTime: new Date("2026-01-05T11:00:00.000Z"),
        endTime: new Date("2026-01-05T11:30:00.000Z"),
        title: "Second organizer booking",
        attendees: [{ email: "guest-2@example.com" }],
        eventType: null,
      },
    ]);

    mockDependencies.oooRepo.findManyOOO.mockResolvedValue([
      {
        id: 201,
        start: new Date("2026-01-05T00:00:00.000Z"),
        end: new Date("2026-01-05T23:59:59.000Z"),
        notes: null,
        showNotePublicly: false,
        user: { id: 29, name: "Host One" },
        toUser: null,
        reason: null,
      },
      {
        id: 202,
        start: new Date("2026-01-06T00:00:00.000Z"),
        end: new Date("2026-01-06T23:59:59.000Z"),
        notes: null,
        showNotePublicly: false,
        user: { id: 31, name: "Host Two" },
        toUser: null,
        reason: null,
      },
    ]);

    mockDependencies.userAvailabilityService.getUsersAvailability.mockResolvedValue([
      createAvailabilityResult(),
      createAvailabilityResult(),
    ]);

    await (
      service as unknown as { calculateHostsAndAvailabilities: CalculateHostsAndAvailabilities }
    ).calculateHostsAndAvailabilities({
      input: {
        duration: 30,
      },
      eventType: {
        id: 52,
        seatsPerTimeSlot: null,
        bookingLimits: null,
        durationLimits: null,
        schedule: null,
        team: null,
        parent: null,
        afterEventBuffer: 0,
        beforeEventBuffer: 0,
      },
      hosts: [{ user: firstUser }, { user: secondUser }],
      loggerWithEventDetails: {
        debug: vi.fn(),
      },
      browsingWindowStart: dayjs("2026-01-05T00:00:00.000Z"),
      browsingWindowEnd: dayjs("2026-01-06T00:00:00.000Z"),
      bypassBusyCalendarTimes: false,
      silentCalendarFailures: false,
      mode: "slots",
    } as Parameters<CalculateHostsAndAvailabilities>[0]);

    expect(mockDependencies.userAvailabilityService.getUsersAvailability).toHaveBeenCalledTimes(1);

    const [[{ users }]] = mockDependencies.userAvailabilityService.getUsersAvailability.mock.calls;

    expect(users[0].currentBookings).toHaveLength(2);
    expect(users[0].currentBookings).toEqual([
      expect.objectContaining({
        id: 101,
        uid: "booking-for-host-1",
      }),
      expect.objectContaining({
        id: 102,
        uid: "booking-where-host-1-is-an-attendee",
      }),
    ]);
    expect(users[0].currentBookings[0]).not.toHaveProperty("attendees");
    expect(users[0].currentBookings[1]).not.toHaveProperty("attendees");
    expect(users[0].outOfOfficeDays).toEqual([
      expect.objectContaining({
        id: 201,
      }),
    ]);

    expect(users[1].currentBookings).toEqual([
      expect.objectContaining({
        id: 103,
        uid: "booking-for-host-2",
      }),
    ]);
    expect(users[1].outOfOfficeDays).toEqual([
      expect.objectContaining({
        id: 202,
      }),
    ]);
  });
});
