import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before importing
vi.mock("@calcom/lib/sentryWrapper", () => ({
  withReporting: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("@calcom/lib/server/perfObserver", () => ({
  performance: {
    mark: vi.fn(),
    measure: vi.fn(),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => {
  const MockBookingRepository = class {
    getTotalBookingDuration = vi.fn().mockResolvedValue(0);
    getAllAcceptedTeamBookingsOfUser = vi.fn().mockResolvedValue([]);
  };
  return { BookingRepository: MockBookingRepository };
});

vi.mock("@calcom/features/di/containers/BookingLimits", () => ({
  getCheckBookingLimitsService: vi.fn().mockReturnValue({
    checkBookingLimit: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: vi.fn().mockReturnValue({
    getStartEndDateforLimitCheck: vi.fn().mockReturnValue({
      limitDateFrom: dayjs().startOf("day"),
      limitDateTo: dayjs().endOf("day"),
    }),
  }),
}));

// Import for mocking
import LimitManager, { LimitSources } from "@calcom/lib/intervalLimits/limitManager";
import {
  getBusyTimesFromBookingLimits,
  getBusyTimesFromLimits,
  getBusyTimesFromTeamLimits,
} from "./getBusyTimesFromLimits";

const startOfTomorrow = dayjs().add(1, "day").startOf("day");

describe("LimitSources", () => {
  it("should return correct title and source for eventBookingLimit", () => {
    const result = LimitSources.eventBookingLimit({ limit: 5, unit: "day" });
    expect(result.title).toBe("busy_time.event_booking_limit");
    expect(result.source).toBe("Event Booking Limit for User: 5 per day");
  });

  it("should return correct title and source for eventDurationLimit", () => {
    const result = LimitSources.eventDurationLimit({ limit: 120, unit: "week" });
    expect(result.title).toBe("busy_time.event_duration_limit");
    expect(result.source).toBe("Event Duration Limit for User: 120 minutes per week");
  });

  it("should return correct title and source for teamBookingLimit", () => {
    const result = LimitSources.teamBookingLimit({ limit: 10, unit: "month" });
    expect(result.title).toBe("busy_time.team_booking_limit");
    expect(result.source).toBe("Team Booking Limit: 10 per month");
  });
});
describe("getBusyTimesFromLimits", () => {
  const browsingWindowStart = dayjs("2024-01-15T00:00:00Z");
  const browsingWindowEnd = dayjs("2024-01-15T23:59:59Z");
  const eventType = { id: 1, length: 30 };
  const bookings: EventBusyDetails[] = [];
  const timeZone = "UTC";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no limits are provided", async () => {
    const result = await getBusyTimesFromLimits(
      null,
      null,
      browsingWindowStart,
      browsingWindowEnd,
      30,
      eventType,
      bookings,
      timeZone
    );

    expect(result).toEqual([]);
  });

  it("should process booking limits when provided", async () => {
    const bookingLimits = { PER_DAY: 3 };

    const result = await getBusyTimesFromLimits(
      bookingLimits,
      null,
      browsingWindowStart,
      browsingWindowEnd,
      30,
      eventType,
      bookings,
      timeZone
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should process duration limits when provided", async () => {
    const durationLimits = { PER_DAY: 120 };

    const result = await getBusyTimesFromLimits(
      null,
      durationLimits,
      browsingWindowStart,
      browsingWindowEnd,
      30,
      eventType,
      bookings,
      timeZone
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should process both booking and duration limits together", async () => {
    const bookingLimits = { PER_DAY: 3 };
    const durationLimits = { PER_DAY: 120 };

    const result = await getBusyTimesFromLimits(
      bookingLimits,
      durationLimits,
      browsingWindowStart,
      browsingWindowEnd,
      30,
      eventType,
      bookings,
      timeZone
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should pass rescheduleUid through to limit checks", async () => {
    const bookingLimits = { PER_DAY: 3 };

    const result = await getBusyTimesFromLimits(
      bookingLimits,
      null,
      browsingWindowStart,
      browsingWindowEnd,
      30,
      eventType,
      bookings,
      timeZone,
      "reschedule-uid-123"
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should return busy times with duration limit source when duration limit is exceeded", async () => {
    const mockBookings: EventBusyDetails[] = [
      {
        start: startOfTomorrow.set("hour", 9).toDate(),
        end: startOfTomorrow.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
    ];

    const mockEventType = {
      id: 1,
      length: 30,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      null,
      { PER_DAY: 60 },
      startOfTomorrow,
      startOfTomorrow.endOf("day"),
      30,
      mockEventType,
      mockBookings,
      "UTC"
    );

    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.event_duration_limit",
      source: "Event Duration Limit for User: 60 minutes per day",
    });
  });

  it("should return empty array when no limits are exceeded", async () => {
    const mockEventType = {
      id: 1,
      length: 30,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      { PER_DAY: 10 },
      null,
      startOfTomorrow,
      startOfTomorrow.endOf("day"),
      30,
      mockEventType,
      [],
      "UTC"
    );

    expect(busyTimes.length).toBe(0);
  });

  it("should return busy times with booking limit source when booking limit is reached", async () => {
    const mockBookings: EventBusyDetails[] = [
      {
        start: startOfTomorrow.set("hour", 9).toDate(),
        end: startOfTomorrow.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
      {
        start: startOfTomorrow.set("hour", 11).toDate(),
        end: startOfTomorrow.set("hour", 12).toDate(),
        title: "Booking 2",
        source: "eventType-1-booking-2",
      },
      {
        start: startOfTomorrow.set("hour", 14).toDate(),
        end: startOfTomorrow.set("hour", 15).toDate(),
        title: "Booking 3",
        source: "eventType-1-booking-3",
      },
    ];

    const mockEventType = {
      id: 1,
      length: 60,
      seatsPerTimeSlot: null,
      hosts: [],
      users: [],
    };

    const busyTimes = await getBusyTimesFromLimits(
      { PER_DAY: 3 },
      null,
      startOfTomorrow,
      startOfTomorrow.endOf("day"),
      60,
      mockEventType,
      mockBookings,
      "UTC"
    );

    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.event_booking_limit",
      source: "Event Booking Limit for User: 3 per day",
    });
  });
});

describe("getBusyTimesFromBookingLimits", () => {
  const browsingWindowStart = dayjs("2024-01-15T00:00:00Z");
  const browsingWindowEnd = dayjs("2024-01-15T23:59:59Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return busy times with correct source when booking limit is reached", async () => {
    const limitManager = new LimitManager();

    const mockBookings: EventBusyDetails[] = [
      {
        start: startOfTomorrow.set("hour", 9).toDate(),
        end: startOfTomorrow.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
      {
        start: startOfTomorrow.set("hour", 11).toDate(),
        end: startOfTomorrow.set("hour", 12).toDate(),
        title: "Booking 2",
        source: "eventType-1-booking-2",
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: mockBookings,
      bookingLimits: { PER_DAY: 2 },
      browsingWindowStart: startOfTomorrow,
      browsingWindowEnd: startOfTomorrow.endOf("day"),
      limitManager,
      eventTypeId: 1,
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.event_booking_limit",
      source: "Event Booking Limit for User: 2 per day",
    });
  });

  it("should return busy times with team booking limit source when teamId is provided", async () => {
    const limitManager = new LimitManager();

    const mockBookings: EventBusyDetails[] = [
      {
        start: startOfTomorrow.set("hour", 9).toDate(),
        end: startOfTomorrow.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: mockBookings,
      bookingLimits: { PER_DAY: 1 },
      browsingWindowStart: startOfTomorrow,
      browsingWindowEnd: startOfTomorrow.endOf("day"),
      limitManager,
      teamId: 1,
      user: { id: 1, email: "test@example.com" },
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes.length).toBe(1);
    expect(busyTimes[0]).toMatchObject({
      title: "busy_time.team_booking_limit",
      source: "Team Booking Limit: 1 per day",
    });
  });

  it("should skip limit keys that have no limit value", async () => {
    const limitManager = new LimitManager();
    const getBusyTimesSpy = vi.spyOn(limitManager, "getBusyTimes");

    await getBusyTimesFromBookingLimits({
      bookings: [],
      bookingLimits: {},
      browsingWindowStart,
      browsingWindowEnd,
      limitManager,
      timeZone: "UTC",
    });

    // No busy times should be added for empty limits
    expect(getBusyTimesSpy).not.toHaveBeenCalled();
  });

  it("should mark period as busy when booking count reaches limit", async () => {
    const limitManager = new LimitManager();
    const testBookings: EventBusyDetails[] = [
      {
        start: dayjs("2024-01-15T10:00:00Z").toDate(),
        end: dayjs("2024-01-15T10:30:00Z").toDate(),
      },
      {
        start: dayjs("2024-01-15T11:00:00Z").toDate(),
        end: dayjs("2024-01-15T11:30:00Z").toDate(),
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: testBookings,
      bookingLimits: { PER_DAY: 2 },
      browsingWindowStart,
      browsingWindowEnd,
      limitManager,
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes.length).toBeGreaterThanOrEqual(1);
  });

  it("should not mark period as busy when booking count is below limit", async () => {
    const limitManager = new LimitManager();
    const testBookings: EventBusyDetails[] = [
      {
        start: dayjs("2024-01-15T10:00:00Z").toDate(),
        end: dayjs("2024-01-15T10:30:00Z").toDate(),
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: testBookings,
      bookingLimits: { PER_DAY: 5 },
      browsingWindowStart,
      browsingWindowEnd,
      limitManager,
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes).toHaveLength(0);
  });

  it("should handle PER_WEEK limit", async () => {
    const limitManager = new LimitManager();
    const weekDateFrom = dayjs("2024-01-15T00:00:00Z");
    const weekDateTo = dayjs("2024-01-21T23:59:59Z");

    const testBookings: EventBusyDetails[] = Array.from({ length: 5 }, (_, i) => ({
      start: dayjs("2024-01-15T10:00:00Z").add(i, "day").toDate(),
      end: dayjs("2024-01-15T10:30:00Z").add(i, "day").toDate(),
    }));

    await getBusyTimesFromBookingLimits({
      bookings: testBookings,
      bookingLimits: { PER_WEEK: 5 },
      browsingWindowStart: weekDateFrom,
      browsingWindowEnd: weekDateTo,
      limitManager,
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle PER_MONTH limit", async () => {
    const limitManager = new LimitManager();
    const monthDateFrom = dayjs("2024-01-01T00:00:00Z");
    const monthDateTo = dayjs("2024-01-31T23:59:59Z");

    await getBusyTimesFromBookingLimits({
      bookings: [],
      bookingLimits: { PER_MONTH: 10 },
      browsingWindowStart: monthDateFrom,
      browsingWindowEnd: monthDateTo,
      limitManager,
      timeZone: "UTC",
    });

    const busyTimes = limitManager.getBusyTimes();
    // No bookings, so no busy times
    expect(busyTimes).toHaveLength(0);
  });

  it("should skip already busy periods", async () => {
    const limitManager = new LimitManager();
    // Pre-mark the period as busy
    limitManager.addBusyTime({
      start: browsingWindowStart.startOf("day"),
      unit: "day",
      title: "busy_time.event_booking_limit",
      source: "Event Booking Limit for User: 1 per day",
    });

    const testBookings: EventBusyDetails[] = [
      {
        start: dayjs("2024-01-15T10:00:00Z").toDate(),
        end: dayjs("2024-01-15T10:30:00Z").toDate(),
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: testBookings,
      bookingLimits: { PER_DAY: 1 },
      browsingWindowStart,
      browsingWindowEnd,
      limitManager,
      timeZone: "UTC",
    });

    // Should still have the original busy time
    const busyTimes = limitManager.getBusyTimes();
    expect(busyTimes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getBusyTimesFromTeamLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch team bookings and check limits", async () => {
    const browsingWindowStart = dayjs("2024-01-15T00:00:00Z");
    const browsingWindowEnd = dayjs("2024-01-15T23:59:59Z");

    const result = await getBusyTimesFromTeamLimits(
      { id: 1, email: "user@example.com" },
      { PER_DAY: 5 },
      browsingWindowStart,
      browsingWindowEnd,
      100, // teamId
      false, // includeManagedEvents
      "UTC"
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should pass rescheduleUid through to team limit checks", async () => {
    const browsingWindowStart = dayjs("2024-01-15T00:00:00Z");
    const browsingWindowEnd = dayjs("2024-01-15T23:59:59Z");

    const result = await getBusyTimesFromTeamLimits(
      { id: 1, email: "user@example.com" },
      { PER_DAY: 5 },
      browsingWindowStart,
      browsingWindowEnd,
      100,
      false,
      "UTC",
      "reschedule-uid-456"
    );

    expect(Array.isArray(result)).toBe(true);
  });
});
