import { describe, expect, it, vi, beforeEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { EventBusyDetails } from "@calcom/types/Calendar";

import type { IntervalLimit } from "../intervalLimitSchema";
import LimitManager from "../limitManager";
import { getBusyTimesFromBookingLimits } from "./getBusyTimesFromLimits";

vi.mock("./checkBookingLimits", () => ({
  checkBookingLimit: vi.fn(),
}));

const createMockBooking = (start: string, end: string, title = "Test Booking"): EventBusyDetails => ({
  start: new Date(start),
  end: new Date(end),
  title,
  source: "test",
  userId: 1,
});

const createMockBookings = (): EventBusyDetails[] => [
  createMockBooking("2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z", "Booking 1"),
  createMockBooking("2024-01-15T14:00:00Z", "2024-01-15T15:00:00Z", "Booking 2"),
  createMockBooking("2024-01-16T09:00:00Z", "2024-01-16T10:00:00Z", "Booking 3"),
  createMockBooking("2024-01-22T11:00:00Z", "2024-01-22T12:00:00Z", "Booking 4"),
  createMockBooking("2024-02-05T13:00:00Z", "2024-02-05T14:00:00Z", "Booking 5"),
];

describe("getBusyTimesFromBookingLimits - Main Branch Baseline", () => {
  let limitManager: LimitManager;

  beforeEach(() => {
    limitManager = new LimitManager();
    vi.clearAllMocks();
  });

  describe("daily limits", () => {
    it("should mark days as busy when daily limit is reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_DAY: 1 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      const jan15BusyTime = busyTimes.find((bt) => dayjs(bt.start).format("YYYY-MM-DD") === "2024-01-15");
      expect(jan15BusyTime).toBeDefined();
      expect(new Date(jan15BusyTime?.end)).toEqual(dayjs("2024-01-15").endOf("day").toDate());
    });

    it("should not mark days as busy when daily limit is not reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_DAY: 3 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);
    });

    it("should handle edge case with exactly limit number of bookings", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_DAY: 2 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      const jan15BusyTime = busyTimes.find((bt) => dayjs(bt.start).format("YYYY-MM-DD") === "2024-01-15");
      expect(jan15BusyTime).toBeDefined();
    });
  });

  describe("weekly limits", () => {
    it("should mark weeks as busy when weekly limit is reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_WEEK: 3 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes.length).toBeGreaterThan(0);

      const weekBusyTime = busyTimes.find((bt) => {
        const start = dayjs(bt.start);
        const end = dayjs(bt.end);
        return end.diff(start, "day") >= 6;
      });
      expect(weekBusyTime).toBeDefined();
    });

    it("should not mark weeks as busy when weekly limit is not reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_WEEK: 10 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);
    });
  });

  describe("monthly limits", () => {
    it("should mark months as busy when monthly limit is reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_MONTH: 3 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-02-29");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      const januaryBusyTime = busyTimes.find((bt) => {
        const start = dayjs(bt.start);
        return start.month() === 0 && start.year() === 2024;
      });
      expect(januaryBusyTime).toBeDefined();
    });

    it("should not mark months as busy when monthly limit is not reached", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_MONTH: 10 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-02-29");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);
    });
  });

  describe("yearly limits", () => {
    it("should handle yearly limits with database queries", async () => {
      const { checkBookingLimit } = await import("./checkBookingLimits");
      const mockCheckBookingLimit = vi.mocked(checkBookingLimit);

      mockCheckBookingLimit.mockRejectedValue(new Error("booking_limit_reached"));

      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_YEAR: 2 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-12-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      const yearBusyTime = busyTimes.find((bt) => {
        const start = dayjs(bt.start);
        const end = dayjs(bt.end);
        return end.diff(start, "day") >= 365;
      });
      expect(yearBusyTime).toBeDefined();

      expect(mockCheckBookingLimit).toHaveBeenCalledWith({
        eventStartDate: expect.any(Date),
        limitingNumber: 2,
        eventId: 1,
        key: "PER_YEAR",
        teamId: undefined,
        user: undefined,
        rescheduleUid: undefined,
        includeManagedEvents: false,
        timeZone: "UTC",
      });
    });

    it("should not mark year as busy when yearly limit is not reached", async () => {
      const { checkBookingLimit } = await import("./checkBookingLimits");
      const mockCheckBookingLimit = vi.mocked(checkBookingLimit);

      mockCheckBookingLimit.mockResolvedValue(undefined);

      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = { PER_YEAR: 10 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-12-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);

      expect(mockCheckBookingLimit).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty bookings array", async () => {
      const bookings: EventBusyDetails[] = [];
      const bookingLimits: IntervalLimit = { PER_DAY: 1 };
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);
    });

    it("should handle empty booking limits", async () => {
      const bookings = createMockBookings();
      const bookingLimits: IntervalLimit = {};
      const dateFrom = dayjs("2024-01-01");
      const dateTo = dayjs("2024-01-31");

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits,
        dateFrom,
        dateTo,
        limitManager,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();

      expect(busyTimes).toHaveLength(0);
    });
  });
});
