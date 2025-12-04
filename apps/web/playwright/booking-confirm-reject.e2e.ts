import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe("Booking Confirmation and Rejection via API", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("should successfully confirm a booking via GET /api/verify-booking-token", async ({ users }) => {
    // Create a user with an event type that requires confirmation
    const organizer = await users.create({
      name: "Test Organizer",
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
          requiresConfirmation: true,
        },
      ],
    });

    const eventType = organizer.eventTypes.find((e) => e.slug === "30-min");
    if (!eventType) {
      throw new Error("Event type not found");
    }

    // Create a pending booking with oneTimePassword
    const oneTimePassword = uuidv4();
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes later

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

    // Call the API endpoint to confirm the booking
    const url = new URL(`${WEBAPP_URL}/api/verify-booking-token`);
    url.searchParams.set("action", "accept");
    url.searchParams.set("token", oneTimePassword);
    url.searchParams.set("bookingUid", booking.uid);
    url.searchParams.set("userId", organizer.id.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual", // Don't follow redirects
    });

    // Should redirect to booking page
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(`/booking/${booking.uid}`);

    // Verify booking is confirmed in database
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
    expect(updatedBooking?.oneTimePassword).toBeNull();
  });

  test("should successfully reject a booking via POST /api/verify-booking-token", async ({ users }) => {
    const organizer = await users.create({
      name: "Test Organizer",
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
          requiresConfirmation: true,
        },
      ],
    });

    const eventType = organizer.eventTypes.find((e) => e.slug === "30-min");
    if (!eventType) {
      throw new Error("Event type not found");
    }

    // Create a pending booking with oneTimePassword
    const oneTimePassword = uuidv4();
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes later

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

    // Call the API endpoint to reject the booking
    const url = new URL(`${WEBAPP_URL}/api/verify-booking-token`);
    url.searchParams.set("action", "reject");
    url.searchParams.set("token", oneTimePassword);
    url.searchParams.set("bookingUid", booking.uid);
    url.searchParams.set("userId", organizer.id.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Not available at this time" }),
      redirect: "manual", // Don't follow redirects
    });

    // Should redirect to booking page
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(`/booking/${booking.uid}`);

    // Verify booking is rejected in database
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });

    expect(updatedBooking?.status).toBe(BookingStatus.REJECTED);
    expect(updatedBooking?.rejectionReason).toBe("Not available at this time");
    expect(updatedBooking?.oneTimePassword).toBeNull();
  });
});
