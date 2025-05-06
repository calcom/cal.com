import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

describe("BookingDenormalized", () => {
  let userId: number;
  let eventTypeId: number;
  let bookingId: number;

  beforeEach(async () => {
    const randomId = Math.floor(Math.random() * 1000000);

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `booking-denorm-${randomId}@example.com`,
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
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
      },
    });
    bookingId = booking.id;
  });

  afterEach(async () => {
    // Clean up test data in reverse order of creation to avoid foreign key constraints
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
    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        title: "Updated Booking",
        status: BookingStatus.CANCELLED,
      },
    });

    const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(denormalizedBooking.title).toBe("Updated Booking");
    expect(denormalizedBooking.status).toBe(BookingStatus.CANCELLED);
  });

  it("should update denormalized entry when user is updated", async () => {
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: "Updated User",
        email: "updated@example.com",
      },
    });

    const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(denormalizedBooking.userName).toBe("Updated User");
    expect(denormalizedBooking.userEmail).toBe("updated@example.com");
  });

  it("should update denormalized entry when event type is updated", async () => {
    // Update event type
    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: {
        length: 30,
      },
    });

    const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(denormalizedBooking.eventLength).toBe(30);
  });

  it("should delete denormalized entry when booking is deleted", async () => {
    // Delete booking
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    const denormalizedBooking = await prisma.bookingDenormalized.findUnique({
      where: { id: bookingId },
    });

    expect(denormalizedBooking).toBeNull();
  });

  it("should delete denormalized entries when user is deleted", async () => {
    // Create another booking for the same user
    const booking2 = await prisma.booking.create({
      data: {
        uid: "test-booking-2",
        title: "Test Booking 2",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: userId,
        eventTypeId: eventTypeId,
        status: BookingStatus.ACCEPTED,
      },
    });

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Check both denormalized bookings
    const denormalizedBooking1 = await prisma.bookingDenormalized.findUnique({
      where: { id: bookingId },
    });
    const denormalizedBooking2 = await prisma.bookingDenormalized.findUnique({
      where: { id: booking2.id },
    });

    expect(denormalizedBooking1).toBeNull();
    expect(denormalizedBooking2).toBeNull();
  });

  it("should update denormalized entries when event type is deleted", async () => {
    // Create another booking for the same event type
    const booking2 = await prisma.booking.create({
      data: {
        uid: "test-booking-2",
        title: "Test Booking 2",
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        userId: userId,
        eventTypeId: eventTypeId,
        status: BookingStatus.ACCEPTED,
      },
    });

    // Delete event type
    await prisma.eventType.delete({
      where: { id: eventTypeId },
    });

    // Check both denormalized bookings
    const denormalizedBooking1 = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });
    const denormalizedBooking2 = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: booking2.id },
    });

    expect(denormalizedBooking1.eventTypeId).toBeNull();
    expect(denormalizedBooking1.eventLength).toBeNull();

    expect(denormalizedBooking2.eventTypeId).toBeNull();
    expect(denormalizedBooking2.eventLength).toBeNull();
  });
});
