import prisma from "@calcom/prisma";
import { BookingStatus, SchedulingType } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("BookingDenormalized", () => {
  let userId: number;
  let eventTypeId: number;
  let bookingId: number;
  const randomId = Math.floor(Math.random() * 1000000);
  const email = `booking-denorm-${randomId}@example.com`;
  const updatedEmail = `updated-${email}`;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email,
        username: `booking-denorm-testuser-${randomId}`,
        name: "Test User",
      },
    });
    userId = user.id;

    // Create test event type
    const eventType = await prisma.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        length: 60,
        userId: user.id,
      },
    });
    eventTypeId = eventType.id;

    // Create test booking
    const booking = await prisma.booking.create({
      data: {
        uid: `booking-denorm-${randomId}`,
        title: "Test Booking",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
      },
    });
    bookingId = booking.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse order of creation
    if (bookingId) {
      await prisma.booking.deleteMany({
        where: { id: bookingId },
      });
    }
    if (eventTypeId) {
      await prisma.eventType.deleteMany({
        where: { id: eventTypeId },
      });
    }
    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
  });

  describe("Creation and Updates", () => {
    it("should create denormalized entry when booking is created", async () => {
      const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(denormalizedBooking.eventTypeId).toBe(eventTypeId);
      expect(denormalizedBooking.userId).toBe(userId);
      expect(denormalizedBooking.title).toBe("Test Booking");
      expect(denormalizedBooking.eventLength).toBe(60);
      expect(denormalizedBooking.userName).toBe("Test User");
    });

    it("should update denormalized entry when booking is updated", async () => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          title: "Updated Booking",
          status: BookingStatus.CANCELLED,
        },
      });

      const updatedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(updatedDenormalizedBooking.title).toBe("Updated Booking");
      expect(updatedDenormalizedBooking.status).toBe(BookingStatus.CANCELLED);
    });

    it("should update denormalized entry when user is updated", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: "Updated User",
          email: updatedEmail,
        },
      });

      const userUpdatedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(userUpdatedDenormalizedBooking.userName).toBe("Updated User");
      expect(userUpdatedDenormalizedBooking.userEmail).toBe(updatedEmail);
    });

    it("should update denormalized entry when event type is updated", async () => {
      await prisma.eventType.update({
        where: { id: eventTypeId },
        data: {
          length: 30,
          schedulingType: SchedulingType.ROUND_ROBIN,
        },
      });

      const eventTypeUpdatedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(eventTypeUpdatedDenormalizedBooking.eventLength).toBe(30);
    });
  });

  describe("Deletion Scenarios", () => {
    it("should delete denormalized entry when booking is deleted", async () => {
      await prisma.booking.delete({
        where: { id: bookingId },
      });

      const deletedDenormalizedBooking = await prisma.bookingDenormalized.findUnique({
        where: { id: bookingId },
      });

      expect(deletedDenormalizedBooking).toBeNull();
    });

    it("should update denormalized entries when event type is deleted", async () => {
      // Create an additional booking for this test
      const booking2 = await prisma.booking.create({
        data: {
          uid: `test-booking-${Math.floor(Math.random() * 1000000)}`,
          title: "Test Booking 2",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: userId,
          eventTypeId: eventTypeId,
          status: BookingStatus.PENDING,
        },
      });

      await prisma.eventType.delete({
        where: { id: eventTypeId },
      });

      const eventTypeDeletedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: booking2.id },
      });

      expect(eventTypeDeletedDenormalizedBooking.eventTypeId).toBeNull();
      expect(eventTypeDeletedDenormalizedBooking.eventLength).toBeNull();

      // Clean up the additional booking
      await prisma.booking.deleteMany({
        where: { id: booking2.id },
      });
    });

    it("should delete denormalized entries when user is deleted", async () => {
      // Create an additional booking for this test
      const booking2 = await prisma.booking.create({
        data: {
          uid: `test-booking-${Math.floor(Math.random() * 1000000)}`,
          title: "Test Booking 2",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: userId,
          eventTypeId: eventTypeId,
          status: BookingStatus.PENDING,
        },
      });

      await prisma.user.delete({
        where: { id: userId },
      });

      const userDeletedDenormalizedBooking1 = await prisma.bookingDenormalized.findUnique({
        where: { id: bookingId },
      });
      const userDeletedDenormalizedBooking2 = await prisma.bookingDenormalized.findUnique({
        where: { id: booking2.id },
      });

      expect(userDeletedDenormalizedBooking1).toBeNull();
      expect(userDeletedDenormalizedBooking2).toBeNull();
    });
  });

  describe("Data Integrity", () => {
    it("should maintain correct relationships across all tables", async () => {
      const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      const originalBooking = await prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
      });

      // Verify relationships and data consistency
      expect(denormalizedBooking.uid).toBe(originalBooking.uid);
      expect(denormalizedBooking.eventTypeId).toBe(originalBooking.eventTypeId);
      expect(denormalizedBooking.userId).toBe(originalBooking.userId);
      expect(denormalizedBooking.status).toBe(originalBooking.status);
      expect(denormalizedBooking.startTime.getTime()).toBe(originalBooking.startTime.getTime());
      expect(denormalizedBooking.endTime.getTime()).toBe(originalBooking.endTime.getTime());
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in text fields", async () => {
      const specialChars = "Test 'quotes' and \"double quotes\" and \\ backslashes";
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          title: specialChars,
          description: specialChars,
        },
      });

      const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(denormalizedBooking.title).toBe(specialChars);
      expect(denormalizedBooking.description).toBe(specialChars);
    });

    it("should handle null values in optional fields", async () => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          description: null,
          location: null,
          eventTypeId: null,
        },
      });

      const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
        where: { id: bookingId },
      });

      expect(denormalizedBooking.description).toBeNull();
      expect(denormalizedBooking.location).toBeNull();
      expect(denormalizedBooking.eventTypeId).toBeNull();
    });
  });
});
