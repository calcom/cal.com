import { describe, expect, it } from "vitest";

import dayjs from "@calcom/dayjs";
import LimitManager from "@calcom/lib/intervalLimits/limitManager";

import { getBusyTimesFromBookingLimits } from "./getBusyTimesFromLimits";

const startOfTomorrow = dayjs().add(1, "day").startOf("day");

describe("getBusyTimesFromBookingLimits", () => {
  describe("seat-aware booking limits", () => {
    it("should mark slot as busy when booking limit is reached for non-seated events", async () => {
      const limitManager = new LimitManager();
      const bookings = [
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 1",
          eventTypeId: 1,
        },
        {
          start: startOfTomorrow.set("hour", 14).toDate(),
          end: startOfTomorrow.set("hour", 15).toDate(),
          title: "Booking 2",
          eventTypeId: 1,
        },
      ];

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits: { PER_DAY: 2 },
        dateFrom: startOfTomorrow,
        dateTo: startOfTomorrow.endOf("day"),
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
      });

      const busyTimes = limitManager.getBusyTimes();
      expect(busyTimes.length).toBe(1);
      expect(dayjs(busyTimes[0].start).isSame(startOfTomorrow.startOf("day"))).toBe(true);
    });

    it("should NOT mark slot as busy when booking limit is reached but seats remain", async () => {
      const limitManager = new LimitManager();
      const bookings = [
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 1",
          eventTypeId: 1,
        },
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 2",
          eventTypeId: 1,
        },
      ];

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits: { PER_DAY: 2 },
        dateFrom: startOfTomorrow,
        dateTo: startOfTomorrow.endOf("day"),
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
        eventType: {
          id: 1,
          seatsPerTimeSlot: 5,
          length: 60,
        } as Parameters<typeof getBusyTimesFromBookingLimits>[0]["eventType"],
      });

      const busyTimes = limitManager.getBusyTimes();
      expect(busyTimes.length).toBe(0);
    });

    it("should mark slot as busy when booking limit is reached AND no seats remain", async () => {
      const limitManager = new LimitManager();
      const bookings = [
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 1",
          eventTypeId: 1,
        },
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 2",
          eventTypeId: 1,
        },
      ];

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits: { PER_DAY: 2 },
        dateFrom: startOfTomorrow,
        dateTo: startOfTomorrow.endOf("day"),
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
        eventType: {
          id: 1,
          seatsPerTimeSlot: 2,
          length: 60,
        } as Parameters<typeof getBusyTimesFromBookingLimits>[0]["eventType"],
      });

      const busyTimes = limitManager.getBusyTimes();
      expect(busyTimes.length).toBe(1);
    });

    it("should only count bookings for the same event type when checking seats", async () => {
      const limitManager = new LimitManager();
      const bookings = [
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 1 - Event Type 1",
          eventTypeId: 1,
        },
        {
          start: startOfTomorrow.set("hour", 10).toDate(),
          end: startOfTomorrow.set("hour", 11).toDate(),
          title: "Booking 2 - Event Type 2",
          eventTypeId: 2,
        },
      ];

      await getBusyTimesFromBookingLimits({
        bookings,
        bookingLimits: { PER_DAY: 2 },
        dateFrom: startOfTomorrow,
        dateTo: startOfTomorrow.endOf("day"),
        limitManager,
        eventTypeId: 1,
        timeZone: "UTC",
        eventType: {
          id: 1,
          seatsPerTimeSlot: 3,
          length: 60,
        } as Parameters<typeof getBusyTimesFromBookingLimits>[0]["eventType"],
      });

      const busyTimes = limitManager.getBusyTimes();
      expect(busyTimes.length).toBe(0);
    });
  });
});
