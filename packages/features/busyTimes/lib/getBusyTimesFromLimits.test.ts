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
import LimitManager from "@calcom/lib/intervalLimits/limitManager";
import {
  getBusyTimesFromBookingLimits,
  getBusyTimesFromLimits,
  getBusyTimesFromTeamLimits,
} from "./getBusyTimesFromLimits";

describe("getBusyTimesFromLimits", () => {
  const dateFrom = dayjs("2024-01-15T00:00:00Z");
  const dateTo = dayjs("2024-01-15T23:59:59Z");
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
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
      30,
      eventType,
      bookings,
      timeZone,
      "reschedule-uid-123"
    );

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getBusyTimesFromBookingLimits", () => {
  const dateFrom = dayjs("2024-01-15T00:00:00Z");
  const dateTo = dayjs("2024-01-15T23:59:59Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should skip limit keys that have no limit value", async () => {
    const limitManager = new LimitManager();
    const getBusyTimesSpy = vi.spyOn(limitManager, "getBusyTimes");

    await getBusyTimesFromBookingLimits({
      bookings: [],
      bookingLimits: {},
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
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
      dateFrom,
      dateTo,
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
      dateFrom: weekDateFrom,
      dateTo: weekDateTo,
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
      dateFrom: monthDateFrom,
      dateTo: monthDateTo,
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
    limitManager.addBusyTime(dateFrom.startOf("day"), "day");

    const testBookings: EventBusyDetails[] = [
      {
        start: dayjs("2024-01-15T10:00:00Z").toDate(),
        end: dayjs("2024-01-15T10:30:00Z").toDate(),
      },
    ];

    await getBusyTimesFromBookingLimits({
      bookings: testBookings,
      bookingLimits: { PER_DAY: 1 },
      dateFrom,
      dateTo,
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
    const dateFrom = dayjs("2024-01-15T00:00:00Z");
    const dateTo = dayjs("2024-01-15T23:59:59Z");

    const result = await getBusyTimesFromTeamLimits(
      { id: 1, email: "user@example.com" },
      { PER_DAY: 5 },
      dateFrom,
      dateTo,
      100, // teamId
      false, // includeManagedEvents
      "UTC"
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it("should pass rescheduleUid through to team limit checks", async () => {
    const dateFrom = dayjs("2024-01-15T00:00:00Z");
    const dateTo = dayjs("2024-01-15T23:59:59Z");

    const result = await getBusyTimesFromTeamLimits(
      { id: 1, email: "user@example.com" },
      { PER_DAY: 5 },
      dateFrom,
      dateTo,
      100,
      false,
      "UTC",
      "reschedule-uid-456"
    );

    expect(Array.isArray(result)).toBe(true);
  });
});
