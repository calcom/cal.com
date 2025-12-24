import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe("Booking Confirmation and Rejection via API", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("should successfully confirm a booking via GET /api/verify-booking-token", async ({ page, users }) => {
    const organizer = await users.create({
      name: "Test Organizer",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
          requiresConfirmation: true,
        },
      ],
    });

    const eventType = organizer.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const oneTimePassword = uuidv4();
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `test-booking-${Date.now()}`,
        title: "Test Booking",
        startTime,
        endTime,
        status: BookingStatus.PENDING,
        oneTimePassword,
        user: {
          connect: {
            id: organizer.id,
          },
        },
        eventType: {
          connect: {
            id: eventType.id,
          },
        },
        attendees: {
          create: {
            email: "attendee@example.com",
            name: "Test Attendee",
            timeZone: "Europe/London",
          },
        },
      },
    });

    const url = `/api/verify-booking-token?action=accept&token=${oneTimePassword}&bookingUid=${booking.uid}&userId=${organizer.id}`;

    const response = await page.request.get(url, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    const location = response.headers()["location"];
    expect(location).toContain(`/booking/${booking.uid}`);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
    expect(updatedBooking?.oneTimePassword).toBeNull();
  });

  test("should successfully reject a booking via POST /api/verify-booking-token", async ({ page, users }) => {
    const organizer = await users.create({
      name: "Test Organizer",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
          requiresConfirmation: true,
        },
      ],
    });

    const eventType = organizer.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const oneTimePassword = uuidv4();
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `test-booking-${Date.now()}`,
        title: "Test Booking",
        startTime,
        endTime,
        status: BookingStatus.PENDING,
        oneTimePassword,
        user: {
          connect: {
            id: organizer.id,
          },
        },
        eventType: {
          connect: {
            id: eventType.id,
          },
        },
        attendees: {
          create: {
            email: "attendee@example.com",
            name: "Test Attendee",
            timeZone: "Europe/London",
          },
        },
      },
    });

    const url = `/api/verify-booking-token?action=reject&token=${oneTimePassword}&bookingUid=${booking.uid}&userId=${organizer.id}`;

    const response = await page.request.post(url, {
      data: { reason: "Not available at this time" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    const location = response.headers()["location"];
    expect(location).toContain(`/booking/${booking.uid}`);

    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking?.status).toBe(BookingStatus.REJECTED);
    expect(updatedBooking?.rejectionReason).toBe("Not available at this time");
    expect(updatedBooking?.oneTimePassword).toBeNull();
  });
});
