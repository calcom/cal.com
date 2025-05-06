import { expect } from "@playwright/test";

import type { User, EventType } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("BookingDenormalized", () => {
  let userId: number;
  let eventTypeId: number;
  let bookingId: number;
  let user: User;
  let eventType: EventType;

  test.beforeEach(async ({ prisma }) => {
    // Create test user with random email to avoid conflicts
    const randomId = Math.floor(Math.random() * 1000000);
    user = await prisma.user.create({
      data: {
        email: `booking-denorm-${randomId}@example.com`,
        username: `booking-denorm-testuser-${randomId}`,
        name: "Test User",
      },
    });
    userId = user.id;

    // Create test event type
    eventType = await prisma.eventType.create({
      data: {
        title: "Test Event",
        slug: "test-event",
        length: 60,
        userId: user.id,
      },
    });
    eventTypeId = eventType.id;

    // Create test booking with PENDING status (no idempotencyKey needed)
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

  test.afterEach(async ({ prisma }) => {
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

  test("should create denormalized entry when booking is created", async ({ prisma }) => {
    const denormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(denormalizedBooking.eventTypeId).toBe(eventTypeId);
    expect(denormalizedBooking.userId).toBe(userId);
    expect(denormalizedBooking.title).toBe("Test Booking");
    expect(denormalizedBooking.eventLength).toBe(60);
    expect(denormalizedBooking.userName).toBe("Test User");
  });

  test("should update denormalized entry when booking is updated", async ({ prisma }) => {
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

  test("should update denormalized entry when user is updated", async ({ prisma }) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: "Updated User",
        email: "updated@example.com",
      },
    });

    const userUpdatedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(userUpdatedDenormalizedBooking.userName).toBe("Updated User");
    expect(userUpdatedDenormalizedBooking.userEmail).toBe("updated@example.com");
  });

  test("should update denormalized entry when event type is updated", async ({ prisma }) => {
    await prisma.eventType.update({
      where: { id: eventTypeId },
      data: {
        length: 30,
      },
    });

    const eventTypeUpdatedDenormalizedBooking = await prisma.bookingDenormalized.findUniqueOrThrow({
      where: { id: bookingId },
    });

    expect(eventTypeUpdatedDenormalizedBooking.eventLength).toBe(30);
  });

  test("should delete denormalized entry when booking is deleted", async ({ prisma }) => {
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    const deletedDenormalizedBooking = await prisma.bookingDenormalized.findUnique({
      where: { id: bookingId },
    });

    expect(deletedDenormalizedBooking).toBeNull();
  });

  test("should update denormalized entries when event type is deleted", async ({ prisma }) => {
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
  });

  test("should delete denormalized entries when user is deleted", async ({ prisma }) => {
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
