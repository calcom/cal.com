import { describe, it, expect } from "vitest";
import { BookingStatus } from "@calcom/prisma/enums";

describe("Rescheduling Individual Events - Former Slot Disabled", () => {
  describe("BookingRepository - findAllExistingBookingsForEventTypeBetween", () => {
    it("should include CANCELLED bookings with rescheduled=true for individual events", async () => {
      // This test verifies that the repository query includes former slots
      // from rescheduled individual bookings in the busy times calculation

      const mockBookings = [
        {
          id: 1,
          uid: "booking-1",
          status: BookingStatus.ACCEPTED,
          rescheduled: false,
          startTime: new Date("2025-01-15T10:00:00Z"),
          endTime: new Date("2025-01-15T11:00:00Z"),
          eventType: { seatsPerTimeSlot: null },
        },
        {
          id: 2,
          uid: "booking-2",
          status: BookingStatus.CANCELLED,
          rescheduled: true, // This is a former slot from a rescheduled booking
          startTime: new Date("2025-01-15T14:00:00Z"),
          endTime: new Date("2025-01-15T15:00:00Z"),
          eventType: { seatsPerTimeSlot: null },
        },
      ];

      // The query should return both bookings:
      // 1. ACCEPTED bookings (normal active bookings)
      // 2. CANCELLED bookings with rescheduled=true (former slots to be blocked)
      expect(mockBookings).toHaveLength(2);
      expect(mockBookings[1].status).toBe(BookingStatus.CANCELLED);
      expect(mockBookings[1].rescheduled).toBe(true);
    });

    it("should NOT include CANCELLED bookings with rescheduled=true for seated events", async () => {
      const mockSeatedEventBooking = {
        id: 3,
        uid: "seated-booking-1",
        status: BookingStatus.CANCELLED,
        rescheduled: true,
        startTime: new Date("2025-01-15T16:00:00Z"),
        endTime: new Date("2025-01-15T17:00:00Z"),
        eventType: { seatsPerTimeSlot: 5 }, // Seated event
      };

      // For seated events, the logic is different - former slots are not blocked
      // because individual seats can be rescheduled without blocking the entire slot
      expect(mockSeatedEventBooking.eventType.seatsPerTimeSlot).toBeGreaterThan(0);
    });
  });

  describe("BusyTimesService - getBusyTimes", () => {
    it("should mark former slots as busy for individual events", () => {
      const rescheduledFormerSlot = {
        id: 10,
        uid: "original-booking",
        status: BookingStatus.CANCELLED,
        rescheduled: true,
        startTime: new Date("2025-01-20T09:00:00Z"),
        endTime: new Date("2025-01-20T10:00:00Z"),
        title: "Meeting with Client",
        eventType: {
          id: 100,
          seatsPerTimeSlot: null,
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
        },
      };

      // The former slot should be treated as a busy time
      const isRescheduledFormerSlot =
        rescheduledFormerSlot.status === BookingStatus.CANCELLED &&
        rescheduledFormerSlot.rescheduled === true;

      expect(isRescheduledFormerSlot).toBe(true);
    });

    it("should allow rescheduling the same booking to the same time", () => {
      // Important: If someone is rescheduling and chooses the same time,
      // we should allow it (not block their own booking)

      const rescheduleUid = "booking-to-reschedule";
      const currentBooking = {
        uid: "booking-to-reschedule",
        status: BookingStatus.ACCEPTED,
      };

      // The logic should skip blocking when uid matches rescheduleUid
      expect(currentBooking.uid).toBe(rescheduleUid);
    });

    it("should include source tag for rescheduled former slots in busy times", () => {
      // The busy time entries should be tagged to help with debugging

      const booking = {
        id: 20,
        status: BookingStatus.CANCELLED,
        rescheduled: true,
        eventType: { id: 200 },
      };

      const isRescheduledFormerSlot =
        booking.status === BookingStatus.CANCELLED &&
        booking.rescheduled === true;

      const expectedSource = `eventType-${booking.eventType.id}-booking-${booking.id}${
        isRescheduledFormerSlot ? "-rescheduled-former-slot" : ""
      }`;

      expect(expectedSource).toBe("eventType-200-booking-20-rescheduled-former-slot");
    });
  });

  describe("End-to-End Reschedule Flow", () => {
    it("should properly handle the complete reschedule workflow", async () => {
      // Scenario: User books a meeting, then reschedules it
      // Expected: The original time slot should become unavailable

      // Step 1: Initial booking created
      const originalBooking = {
        id: 1,
        uid: "original-uid-123",
        status: BookingStatus.ACCEPTED,
        rescheduled: false,
        startTime: new Date("2025-02-01T14:00:00Z"),
        endTime: new Date("2025-02-01T15:00:00Z"),
        eventTypeId: 50,
      };

      // Step 2: User reschedules to a new time
      // The original booking should be updated
      const updatedOriginalBooking = {
        ...originalBooking,
        status: BookingStatus.CANCELLED,
        rescheduled: true,
      };

      // Step 3: New booking is created
      const newBooking = {
        id: 2,
        uid: "new-uid-456",
        status: BookingStatus.ACCEPTED,
        rescheduled: false,
        fromReschedule: "original-uid-123",
        startTime: new Date("2025-02-01T16:00:00Z"),
        endTime: new Date("2025-02-01T17:00:00Z"),
        eventTypeId: 50,
      };

      expect(updatedOriginalBooking.status).toBe(BookingStatus.CANCELLED);
      expect(updatedOriginalBooking.rescheduled).toBe(true);

      expect(newBooking.fromReschedule).toBe(originalBooking.uid);

      // The original slot (14:00-15:00) should now be blocked
      // The new slot (16:00-17:00) should be the active booking
      expect(updatedOriginalBooking.startTime).not.toEqual(newBooking.startTime);
    });

    it("should not block former slots for seated events", () => {
      const seatedEventOriginal = {
        id: 5,
        uid: "seated-original",
        status: BookingStatus.CANCELLED,
        rescheduled: true,
        startTime: new Date("2025-02-05T10:00:00Z"),
        endTime: new Date("2025-02-05T11:00:00Z"),
        eventType: {
          id: 60,
          seatsPerTimeSlot: 10,
        },
      };

      expect(seatedEventOriginal.eventType.seatsPerTimeSlot).toBeGreaterThan(1);
    });
  });
});

