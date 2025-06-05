import "@calcom/lib/__mocks__/logger";

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import dayjs from "@calcom/dayjs";
import type { BookingStatus } from "@calcom/prisma/enums";
import type { CalendarEventsToSync } from "@calcom/types/Calendar";

import { getBookingUpdateActions } from "./syncDownstream";

// Common booking data for tests
const baseBooking = {
  id: 1,
  startTime: dayjs().toDate(),
  endTime: dayjs().add(1, "hour").toDate(),
  status: "ACCEPTED" as BookingStatus,
};

describe("calendarSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("getBookingUpdateActions", () => {
    const appName = "TestApp";

    it("should return CANCEL_BOOKING if event is cancelled and booking is not", () => {
      const calendarEvent = {
        id: "event2",
        startTime: dayjs(baseBooking.startTime),
        endTime: dayjs(baseBooking.endTime),
        status: "cancelled",
      } as CalendarEventsToSync[number];
      const actions = getBookingUpdateActions({ calendarEvent, booking: baseBooking, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        expect.objectContaining({
          type: "CANCEL_BOOKING",
          bookingId: baseBooking.id,
          cancelledBy: appName,
        })
      );
    });

    it("should return UPDATE_BOOKING_TIMES for future events with different times", () => {
      const booking = { ...baseBooking };
      const newStartTime = dayjs(booking.startTime).add(1, "hour");
      const newEndTime = dayjs(booking.endTime).add(1, "hour");
      const calendarEvent = {
        id: "event4",
        startTime: newStartTime,
        endTime: newEndTime,
        status: "confirmed",
      } as CalendarEventsToSync[number];

      const actions = getBookingUpdateActions({ calendarEvent, booking, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: "UPDATE_BOOKING_TIMES",
        bookingId: booking.id,
        startTime: dayjs(newStartTime).toDate(),
        endTime: dayjs(newEndTime).toDate(),
        rescheduledBy: appName,
      });
    });

    it("should return IGNORE_CHANGE for past event even when the time has changed", () => {
      const pastEventStartTime = "2023-12-31T10:00:00Z";
      const pastEventEndTime = "2023-12-31T11:00:00Z";
      const calendarEvent = {
        id: "event5",
        startTime: dayjs(pastEventStartTime).add(1, "hour"),
        endTime: dayjs(pastEventEndTime).add(1, "hour"),
        status: "confirmed",
      } as CalendarEventsToSync[number];
      const bookingForPastEvent = {
        ...baseBooking,
        id: 5,
        startTime: dayjs(pastEventStartTime).toDate(),
        endTime: dayjs(pastEventEndTime).toDate(),
      };

      vi.setSystemTime(new Date("2024-01-15T12:00:00Z")); // Set current time to after the event

      const actions = getBookingUpdateActions({ calendarEvent, booking: bookingForPastEvent, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: "IGNORE_CHANGE",
        bookingId: bookingForPastEvent.id,
        reason: expect.objectContaining({
          code: "NEW_TIME_IN_PAST",
        }),
      });
    });

    it("should return NO_CHANGE if times are the same", () => {
      const booking = { ...baseBooking };
      const calendarEvent = {
        id: "event6",
        startTime: dayjs(booking.startTime),
        endTime: dayjs(booking.endTime),
        status: "confirmed",
      } as CalendarEventsToSync[number];
      const actions = getBookingUpdateActions({ calendarEvent, booking, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: "NO_CHANGE",
        bookingId: booking.id,
        reason: expect.objectContaining({
          code: "NO_TIME_CHANGE",
        }),
      });
    });

    it("should return IGNORE_CHANGE if the booking is not accepted", () => {
      const calendarEvent = {
        id: "event7",
        startTime: dayjs(baseBooking.startTime),
        endTime: dayjs(baseBooking.endTime),
        status: "cancelled",
      } as CalendarEventsToSync[number];
      const cancelledBooking = { ...baseBooking, status: "CANCELLED" as BookingStatus };
      const actions = getBookingUpdateActions({ calendarEvent, booking: cancelledBooking, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        expect.objectContaining({
          type: "IGNORE_CHANGE",
          bookingId: cancelledBooking.id,
          reason: expect.objectContaining({
            code: "BOOKING_NOT_ACCEPTED",
            message: expect.stringContaining(`Booking ${cancelledBooking.id} is not ACCEPTED`),
          }),
        })
      );
    });

    it("should return NO_CHANGE with code NO_BOOKING_FOUND if booking is null", () => {
      const calendarEvent = {
        id: "event8",
        startTime: dayjs().toDate(),
        endTime: dayjs().add(1, "hour").toDate(),
        status: "confirmed",
      } as CalendarEventsToSync[number];

      const actions = getBookingUpdateActions({ calendarEvent, booking: null, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual({
        type: "NO_CHANGE",
        reason: expect.objectContaining({
          code: "NO_BOOKING_FOUND",
          message: expect.stringContaining(`No Cal.com booking found for Calendar Event ${calendarEvent.id}`),
        }),
      });
    });

    it("should return CANCEL_BOOKING if organizer has declined the meeting", () => {
      const calendarEvent = {
        id: "event9",
        startTime: dayjs(baseBooking.startTime),
        endTime: dayjs(baseBooking.endTime),
        status: "ACCEPTED",
        organizerResponseStatus: "declined",
      } as CalendarEventsToSync[number];
      const actions = getBookingUpdateActions({ calendarEvent, booking: baseBooking, appName });
      expect(actions).toHaveLength(1);
      expect(actions[0]).toEqual(
        expect.objectContaining({
          type: "CANCEL_BOOKING",
          bookingId: baseBooking.id,
          cancelledBy: appName,
          cancellationReason: "event_declined_by_organizer_in_calendar",
        })
      );
    });
  });
});
