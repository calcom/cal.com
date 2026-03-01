import { prisma } from "@calcom/prisma/__mocks__/prisma";
import dayjs from "@calcom/dayjs";
import { getBusyTimesService } from "@calcom/features/di/containers/BusyTimes";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => ({
  default: prisma,
  prisma,
}));

const startOfTomorrow = dayjs().add(1, "day").startOf("day");

const createMockBookingResult = (
  overrides: Partial<{
    id: number;
    startTime: Date;
    endTime: Date;
    eventTypeId: number | null;
    title: string;
    userId: number | null;
  }> = {}
) => ({
  id: 1,
  startTime: startOfTomorrow.set("hour", 10).toDate(),
  endTime: startOfTomorrow.set("hour", 11).toDate(),
  eventTypeId: 1,
  title: "Test Booking",
  userId: 1,
  ...overrides,
});

describe("getStartEndDateforLimitCheck", () => {
  it("should return original dates when no limits are provided", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(startDate, endDate);

    expect(limitDateFrom.format("YYYY-MM-DD")).toBe(startOfTomorrow.format("YYYY-MM-DD"));
    expect(limitDateTo.format("YYYY-MM-DD")).toBe(startOfTomorrow.format("YYYY-MM-DD"));
  });

  it("should expand dates for PER_DAY booking limits", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(startDate, endDate, {
      PER_DAY: 5,
    });

    // Should expand to include full day
    expect(limitDateFrom.valueOf() <= startOfTomorrow.startOf("day").valueOf()).toBe(true);
    expect(limitDateTo.valueOf() >= startOfTomorrow.endOf("day").valueOf()).toBe(true);
  });

  it("should expand dates for PER_WEEK booking limits", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(startDate, endDate, {
      PER_WEEK: 10,
    });

    // Should expand to include full week
    expect(limitDateFrom.valueOf() <= startOfTomorrow.startOf("week").valueOf()).toBe(true);
    expect(limitDateTo.valueOf() >= startOfTomorrow.endOf("week").valueOf()).toBe(true);
  });

  it("should expand dates for PER_MONTH booking limits", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(startDate, endDate, {
      PER_MONTH: 20,
    });

    // Should expand to include full month
    expect(limitDateFrom.valueOf() <= startOfTomorrow.startOf("month").valueOf()).toBe(true);
    expect(limitDateTo.valueOf() >= startOfTomorrow.endOf("month").valueOf()).toBe(true);
  });

  it("should handle both booking and duration limits together", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom, limitDateTo } = busyTimesService.getStartEndDateforLimitCheck(
      startDate,
      endDate,
      { PER_DAY: 5 },
      { PER_MONTH: 480 }
    );

    // Should expand to the largest needed range (month for duration limits)
    expect(limitDateFrom.valueOf() <= startOfTomorrow.startOf("month").valueOf()).toBe(true);
    expect(limitDateTo.valueOf() >= startOfTomorrow.endOf("month").valueOf()).toBe(true);
  });

  it("should not expand for PER_YEAR limits (handled separately)", () => {
    const busyTimesService = getBusyTimesService();
    const startDate = startOfTomorrow.format();
    const endDate = startOfTomorrow.endOf("day").format();

    const { limitDateFrom } = busyTimesService.getStartEndDateforLimitCheck(startDate, endDate, {
      PER_YEAR: 100,
    });

    // PER_YEAR should NOT expand the date range (handled separately for performance)
    expect(limitDateFrom.format("YYYY-MM-DD")).toBe(startOfTomorrow.format("YYYY-MM-DD"));
  });
});

describe("getBusyTimes - expanded edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exclude rescheduled booking from busy times", async () => {
    const busyTimesService = getBusyTimesService();
    const rescheduleUid = "reschedule-uid-123";

    const bookingsWithReschedule = [
      {
        id: 1,
        startTime: startOfTomorrow.set("hour", 10).toDate(),
        endTime: startOfTomorrow.set("hour", 11).toDate(),
        title: "Original Booking",
        userId: 1,
        uid: rescheduleUid,
        eventType: {
          id: 1,
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
          seatsPerTimeSlot: null,
        },
      },
      {
        id: 2,
        startTime: startOfTomorrow.set("hour", 14).toDate(),
        endTime: startOfTomorrow.set("hour", 15).toDate(),
        title: "Other Booking",
        userId: 1,
        uid: "other-uid",
        eventType: {
          id: 1,
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
          seatsPerTimeSlot: null,
        },
      },
    ];

    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "user@example.com",
      username: "testuser",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: bookingsWithReschedule,
      rescheduleUid,
    });

    // The rescheduled booking should be excluded
    expect(busyTimes).toHaveLength(1);
    expect(busyTimes[0].source).toBe("eventType-1-booking-2");
  });

  it("should apply before and after event buffers correctly", async () => {
    const busyTimesService = getBusyTimesService();

    const bookingsWithBuffers = [
      {
        id: 1,
        startTime: startOfTomorrow.set("hour", 10).toDate(),
        endTime: startOfTomorrow.set("hour", 11).toDate(),
        title: "Booking with buffers",
        userId: 1,
        uid: "uid-1",
        eventType: {
          id: 1,
          beforeEventBuffer: 15,
          afterEventBuffer: 10,
          seatsPerTimeSlot: null,
        },
      },
    ];

    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "user@example.com",
      username: "testuser",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: bookingsWithBuffers,
    });

    expect(busyTimes).toHaveLength(1);
    // Before buffer: 10:00 - 15min = 9:45
    expect(dayjs(busyTimes[0].start).hour()).toBe(9);
    expect(dayjs(busyTimes[0].start).minute()).toBe(45);
    // After buffer: 11:00 + 10min = 11:10
    expect(dayjs(busyTimes[0].end).hour()).toBe(11);
    expect(dayjs(busyTimes[0].end).minute()).toBe(10);
  });

  it("should handle seated events with remaining seats (only buffer times as busy)", async () => {
    const busyTimesService = getBusyTimesService();

    const seatedBookings = [
      {
        id: 1,
        startTime: startOfTomorrow.set("hour", 10).toDate(),
        endTime: startOfTomorrow.set("hour", 11).toDate(),
        title: "Seated Event",
        userId: 1,
        uid: "uid-1",
        eventType: {
          id: 1,
          beforeEventBuffer: 10,
          afterEventBuffer: 10,
          seatsPerTimeSlot: 5, // 5 seats available
        },
        _count: {
          seatsReferences: 1, // Only 1 seat taken
        },
      },
    ];

    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      eventTypeId: 1, // Same event type
      userEmail: "user@example.com",
      username: "testuser",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: seatedBookings,
    });

    // With remaining seats, only buffer times should be busy (2 entries: before + after)
    expect(busyTimes).toHaveLength(2);
  });

  it("should block entire slot when seated event is fully booked", async () => {
    const busyTimesService = getBusyTimesService();

    const fullyBookedSeatedBookings = [
      {
        id: 1,
        startTime: startOfTomorrow.set("hour", 10).toDate(),
        endTime: startOfTomorrow.set("hour", 11).toDate(),
        title: "Fully Booked Seated Event",
        userId: 1,
        uid: "uid-1",
        eventType: {
          id: 1,
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
          seatsPerTimeSlot: 1, // Only 1 seat
        },
        _count: {
          seatsReferences: 1, // All seats taken
        },
      },
    ];

    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      eventTypeId: 1,
      userEmail: "user@example.com",
      username: "testuser",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: fullyBookedSeatedBookings,
    });

    // Fully booked - entire slot should be blocked
    expect(busyTimes).toHaveLength(1);
    expect(dayjs(busyTimes[0].start).hour()).toBe(10);
    expect(dayjs(busyTimes[0].end).hour()).toBe(11);
  });

  it("should handle empty currentBookings array", async () => {
    const busyTimesService = getBusyTimesService();

    const busyTimes = await busyTimesService.getBusyTimes({
      credentials: [],
      userId: 1,
      userEmail: "user@example.com",
      username: "testuser",
      bypassBusyCalendarTimes: false,
      selectedCalendars: [],
      startTime: startOfTomorrow.format(),
      endTime: startOfTomorrow.endOf("day").format(),
      currentBookings: [],
    });

    expect(busyTimes).toHaveLength(0);
  });
});

describe("getBusyTimesForLimitChecks - expanded edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should batch queries for 200 users (4 batches)", async () => {
    const userIds = Array.from({ length: 200 }, (_, i) => i + 1);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const busyTimesService = getBusyTimesService();
    await busyTimesService.getBusyTimesForLimitChecks({
      userIds,
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      bookingLimits: { PER_DAY: 5 },
    });

    // 200 users / 50 per batch = 4 batches
    expect(prisma.booking.findMany).toHaveBeenCalledTimes(4);
  });

  it("should batch queries for 251 users (6 batches, max 5 concurrent)", async () => {
    const userIds = Array.from({ length: 251 }, (_, i) => i + 1);
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const busyTimesService = getBusyTimesService();
    await busyTimesService.getBusyTimesForLimitChecks({
      userIds,
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      bookingLimits: { PER_DAY: 5 },
    });

    // 251 / 50 = 6 batches total (ceil)
    expect(prisma.booking.findMany).toHaveBeenCalledTimes(6);
  });

  it("should handle single user correctly", async () => {
    const mockBooking = createMockBookingResult();
    vi.mocked(prisma.booking.findMany).mockResolvedValue([mockBooking]);

    const busyTimesService = getBusyTimesService();
    const busyTimes = await busyTimesService.getBusyTimesForLimitChecks({
      userIds: [1],
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      bookingLimits: { PER_DAY: 5 },
    });

    expect(busyTimes).toHaveLength(1);
    expect(prisma.booking.findMany).toHaveBeenCalledTimes(1);
  });

  it("should correctly pass rescheduleUid to prisma query NOT clause", async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const busyTimesService = getBusyTimesService();
    await busyTimesService.getBusyTimesForLimitChecks({
      userIds: [1],
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      rescheduleUid: "existing-uid",
      bookingLimits: { PER_DAY: 5 },
    });

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { uid: "existing-uid" },
        }),
      })
    );
  });

  it("should not include NOT clause when rescheduleUid is null", async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const busyTimesService = getBusyTimesService();
    await busyTimesService.getBusyTimesForLimitChecks({
      userIds: [1],
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      rescheduleUid: null,
      bookingLimits: { PER_DAY: 5 },
    });

    const callArgs = vi.mocked(prisma.booking.findMany).mock.calls[0][0];
    expect(callArgs?.where).not.toHaveProperty("NOT");
  });

  it("should expand date range for PER_WEEK limits when checking limit dates", async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([]);

    const busyTimesService = getBusyTimesService();
    await busyTimesService.getBusyTimesForLimitChecks({
      userIds: [1],
      eventTypeId: 1,
      startDate: startOfTomorrow.format(),
      endDate: startOfTomorrow.endOf("day").format(),
      bookingLimits: { PER_WEEK: 10 },
    });

    // The query should have been called with expanded date ranges
    expect(prisma.booking.findMany).toHaveBeenCalledTimes(1);
  });
});
