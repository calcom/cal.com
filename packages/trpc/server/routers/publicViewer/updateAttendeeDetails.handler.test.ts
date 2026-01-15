import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateAttendeeDetailsHandler } from "./updateAttendeeDetails.handler";

// Mock Prisma
vi.mock("@calcom/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    attendee: {
      update: vi.fn(),
    },
  },
}));

describe("updateAttendeeDetails.handler", () => {
  const mockBookingWithAttendee = {
    id: 1,
    status: "ACCEPTED",
    title: "15min Meeting between Pro Example and Test Attendee",
    attendees: [
      {
        id: 100,
        email: "attendee@example.com",
        name: "Test Attendee",
        phoneNumber: null,
        timeZone: "America/New_York",
      },
    ],
  };

  const mockUpdatedAttendee = {
    id: 100,
    email: "newemail@example.com",
    name: "Updated Name",
    phoneNumber: "+1234567890",
    timeZone: "Europe/London",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Input validation", () => {
    it("should throw BAD_REQUEST when no update fields are provided", async () => {
      await expect(
        updateAttendeeDetailsHandler({
          input: {
            bookingUid: "test-booking-uid",
            currentEmail: "attendee@example.com",
            // No update fields provided
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "At least one field must be provided to update",
      });
    });
  });

  describe("Booking validation", () => {
    it("should throw NOT_FOUND when booking does not exist", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);

      await expect(
        updateAttendeeDetailsHandler({
          input: {
            bookingUid: "non-existent-booking",
            currentEmail: "attendee@example.com",
            name: "New Name",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    });

    it("should throw BAD_REQUEST when booking is cancelled", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        id: 1,
        status: "CANCELLED",
        title: "Meeting",
        attendees: [],
      });

      await expect(
        updateAttendeeDetailsHandler({
          input: {
            bookingUid: "test-booking-uid",
            currentEmail: "attendee@example.com",
            name: "New Name",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot edit details for a cancelled booking",
      });
    });

    it("should throw BAD_REQUEST when booking is rejected", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        id: 1,
        status: "REJECTED",
        title: "Meeting",
        attendees: [],
      });

      await expect(
        updateAttendeeDetailsHandler({
          input: {
            bookingUid: "test-booking-uid",
            currentEmail: "attendee@example.com",
            name: "New Name",
          },
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Cannot edit details for a cancelled booking",
      });
    });
  });

  describe("Attendee validation", () => {
    it("should throw NOT_FOUND when attendee is not found in booking", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        id: 1,
        status: "ACCEPTED",
        title: "Meeting",
        attendees: [], // Empty array - no matching attendee
      });

      await expect(
        updateAttendeeDetailsHandler({
          input: {
            bookingUid: "test-booking-uid",
            currentEmail: "wrong-email@example.com",
            name: "New Name",
          },
        })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Attendee not found for this booking",
      });
    });
  });

  describe("Successful updates", () => {
    it("should successfully update attendee name only and update booking title", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithAttendee.attendees[0],
        name: "Updated Name",
      });

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          name: "Updated Name",
        },
      });

      expect(result.success).toBe(true);
      expect(result.attendee.name).toBe("Updated Name");
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { name: "Updated Name" },
      });

      // Verify booking title update
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: "15min Meeting between Pro Example and Updated Name" },
      });
    });

    it("should NOT update booking title if it does not contain old name", async () => {
      const mockBookingWithFixedTitle = {
        ...mockBookingWithAttendee,
        title: "Custom Event Title",
      };
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithFixedTitle);
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithFixedTitle.attendees[0],
        name: "Updated Name",
      });

      await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          name: "Updated Name",
        },
      });

      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it("should successfully update attendee email only", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithAttendee.attendees[0],
        email: "newemail@example.com",
      });

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          email: "newemail@example.com",
        },
      });

      expect(result.success).toBe(true);
      expect(result.attendee.email).toBe("newemail@example.com");
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { email: "newemail@example.com" },
      });
      // Should not update booking title
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });

    it("should successfully update attendee phone number only", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithAttendee.attendees[0],
        phoneNumber: "+1234567890",
      });

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          phoneNumber: "+1234567890",
        },
      });

      expect(result.success).toBe(true);
      expect(result.attendee.phoneNumber).toBe("+1234567890");
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { phoneNumber: "+1234567890" },
      });
    });

    it("should successfully update attendee timezone only", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithAttendee.attendees[0],
        timeZone: "Europe/London",
      });

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          timeZone: "Europe/London",
        },
      });

      expect(result.success).toBe(true);
      expect(result.attendee.timeZone).toBe("Europe/London");
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { timeZone: "Europe/London" },
      });
    });

    it("should successfully update multiple fields at once", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue(mockUpdatedAttendee);

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          name: "Updated Name",
          email: "newemail@example.com",
          phoneNumber: "+1234567890",
          timeZone: "Europe/London",
        },
      });

      expect(result.success).toBe(true);
      expect(prisma.attendee.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: {
          name: "Updated Name",
          email: "newemail@example.com",
          phoneNumber: "+1234567890",
          timeZone: "Europe/London",
        },
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle PENDING booking status", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({
        ...mockBookingWithAttendee,
        status: "PENDING",
      });
      vi.mocked(prisma.attendee.update).mockResolvedValue({
        ...mockBookingWithAttendee.attendees[0],
        name: "Updated Name",
      });

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          name: "Updated Name",
        },
      });

      expect(result.success).toBe(true);
    });

    it("should handle updating with same value (no-op)", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBookingWithAttendee);
      vi.mocked(prisma.attendee.update).mockResolvedValue(mockBookingWithAttendee.attendees[0]);

      const result = await updateAttendeeDetailsHandler({
        input: {
          bookingUid: "test-booking-uid",
          currentEmail: "attendee@example.com",
          name: "Test Attendee", // Same as current value
        },
      });

      expect(result.success).toBe(true);
      // No change in name, so no booking title update expected (or maybe we don't care, but logic implies if name changes)
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });
});
