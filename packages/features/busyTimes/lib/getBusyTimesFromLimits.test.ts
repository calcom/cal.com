import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import { LimitSources } from "@calcom/lib/intervalLimits/limitManager";

import { getBusyTimesFromBookingLimits, getBusyTimesFromLimits } from "./getBusyTimesFromLimits";

vi.mock("@calcom/features/di/containers/BookingLimits", () => ({
  getCheckBookingLimitsService: vi.fn(() => ({
    checkBookingLimit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@calcom/features/di/containers/BusyTimes", () => ({
  getBusyTimesService: vi.fn(() => ({
    getStartEndDateforLimitCheck: vi.fn((start, end) => ({
      limitDateFrom: dayjs(start),
      limitDateTo: dayjs(end),
    })),
  })),
}));

vi.mock("@calcom/features/bookings/repositories/BookingRepository", () => ({
  BookingRepository: vi.fn().mockImplementation(() => ({
    getTotalBookingDuration: vi.fn().mockResolvedValue(0),
    getAllAcceptedTeamBookingsOfUser: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
}));

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

describe("getBusyTimesFromBookingLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return busy times with correct source when booking limit is reached", async () => {
    const dateFrom = startOfTomorrow;
    const dateTo = startOfTomorrow.endOf("day");

    const mockBookings = [
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

    const LimitManager = (await import("@calcom/lib/intervalLimits/limitManager")).default;
    const limitManager = new LimitManager();

    await getBusyTimesFromBookingLimits({
      bookings: mockBookings,
      bookingLimits: { PER_DAY: 2 },
      dateFrom,
      dateTo,
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
    const dateFrom = startOfTomorrow;
    const dateTo = startOfTomorrow.endOf("day");

    const mockBookings = [
      {
        start: startOfTomorrow.set("hour", 9).toDate(),
        end: startOfTomorrow.set("hour", 10).toDate(),
        title: "Booking 1",
        source: "eventType-1-booking-1",
      },
    ];

    const LimitManager = (await import("@calcom/lib/intervalLimits/limitManager")).default;
    const limitManager = new LimitManager();

    await getBusyTimesFromBookingLimits({
      bookings: mockBookings,
      bookingLimits: { PER_DAY: 1 },
      dateFrom,
      dateTo,
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
});

describe("getBusyTimesFromLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return busy times with duration limit source when duration limit is exceeded", async () => {
    const dateFrom = startOfTomorrow;
    const dateTo = startOfTomorrow.endOf("day");

    const mockBookings = [
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
      dateFrom,
      dateTo,
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
    const dateFrom = startOfTomorrow;
    const dateTo = startOfTomorrow.endOf("day");

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
      dateFrom,
      dateTo,
      30,
      mockEventType,
      [],
      "UTC"
    );

    expect(busyTimes.length).toBe(0);
  });

  it("should return busy times with booking limit source when booking limit is reached", async () => {
    const dateFrom = startOfTomorrow;
    const dateTo = startOfTomorrow.endOf("day");

    const mockBookings = [
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
      dateFrom,
      dateTo,
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
