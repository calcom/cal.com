import { describe, it, expect } from "vitest";

import { BookingAuditAction, getBookingAuditSchema } from "./booking-audit-schemas";

describe("BookingAuditSchemas", () => {
  describe("CREATED action schema", () => {
    it("should validate valid booking creation data", () => {
      const validData = {
        bookingId: 1,
        action: BookingAuditAction.CREATED,
        data: {
          eventTypeId: 1,
          eventTypeName: "Test Meeting",
          organizerId: 123,
          startTime: "2025-08-01T10:00:00.000Z",
          endTime: "2025-08-01T11:00:00.000Z",
          isConfirmed: true,
          location: "Zoom",
          attendeeCount: 2,
          paymentRequired: false,
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.CREATED);
      const result = schema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should reject invalid booking creation data", () => {
      const invalidData = {
        bookingId: -1, // Invalid
        action: BookingAuditAction.CREATED,
        data: {
          eventTypeId: 1,
          eventTypeName: "", // Invalid
          organizerId: 123,
          startTime: "invalid-date", // Invalid
          endTime: "invalid-date", // Invalid
          isConfirmed: "yes", // Invalid type
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.CREATED);
      const result = schema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe("CANCELLED action schema", () => {
    it("should validate valid booking cancellation data", () => {
      const validData = {
        bookingId: 1,
        action: BookingAuditAction.CANCELLED,
        data: {
          eventTypeId: 1,
          startTime: "2025-08-01T10:00:00.000Z",
          endTime: "2025-08-01T11:00:00.000Z",
          cancellationReason: "Meeting no longer needed",
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.CANCELLED);
      const result = schema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });

  describe("RESCHEDULED action schema", () => {
    it("should validate valid booking reschedule data", () => {
      const validData = {
        bookingId: 1,
        action: BookingAuditAction.RESCHEDULED,
        data: {
          eventTypeId: 1,
          startTime: "2025-08-02T10:00:00.000Z",
          endTime: "2025-08-02T11:00:00.000Z",
          oldStartTime: "2025-08-01T10:00:00.000Z",
          oldEndTime: "2025-08-01T11:00:00.000Z",
          location: "Teams",
          attendeeCount: 2,
          organizerChanged: false,
        },
      };

      const schema = getBookingAuditSchema(BookingAuditAction.RESCHEDULED);
      const result = schema.safeParse(validData);

      expect(result.success).toBe(true);
    });
  });
});
