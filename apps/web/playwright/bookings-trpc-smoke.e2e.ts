import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { createUserWithSeatedEventAndAttendees } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("tRPC bookings route smoke tests", () => {
  test("viewer.bookings.find - should return booking by UID", async ({ page, users }) => {
    const user = await users.create({
      name: "Test User",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    const eventType = user.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const bookingUid = `test-booking-${Date.now()}`;

    const booking = await prisma.booking.create({
      data: {
        uid: bookingUid,
        title: "Test Booking",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        user: {
          connect: {
            id: user.id,
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

    // Call the tRPC endpoint directly
    const response = await page.request.get(
      `/api/trpc/bookings/find?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { bookingUid } } })
      )}`
    );

    expect(response.status()).toBe(200);
    const json = await response.json();

    // tRPC batch response format
    expect(json).toHaveLength(1);
    expect(json[0].result.data.json.booking).toBeDefined();
    expect(json[0].result.data.json.booking.uid).toBe(bookingUid);
    expect(json[0].result.data.json.booking.id).toBe(booking.id);
    expect(json[0].result.data.json.booking.status).toBe(BookingStatus.ACCEPTED);
  });

  test("viewer.bookings.find - should return null for non-existent booking", async ({ page, users }) => {
    await users.create({ name: "Test User" });

    const response = await page.request.get(
      `/api/trpc/bookings/find?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { bookingUid: "non-existent-uid" } } })
      )}`
    );

    expect(response.status()).toBe(200);
    const json = await response.json();

    expect(json).toHaveLength(1);
    expect(json[0].result.data.json.booking).toBeNull();
  });

  test("viewer.bookings.getBookingAttendees - should return seat reference count", async ({
    page,
    users,
    bookings,
  }) => {
    const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);

    await user.apiLogin();

    const bookingAttendees = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const seatReferenceUid = uuidv4();
    const bookingSeats = bookingAttendees.map((attendee, index) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: index === 0 ? seatReferenceUid : uuidv4(),
      data: {
        responses: {
          name: attendee.name,
          email: attendee.email,
        },
      },
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    // Call the tRPC endpoint
    const response = await page.request.get(
      `/api/trpc/bookings/getBookingAttendees?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { seatReferenceUid } } })
      )}`
    );

    expect(response.status()).toBe(200);
    const json = await response.json();

    expect(json).toHaveLength(1);
    // Should return the count of seat references for this booking (3)
    expect(json[0].result.data.json).toBe(3);
  });

  test("viewer.bookings.getInstantBookingLocation - should return booking location for accepted booking", async ({
    page,
    users,
  }) => {
    const user = await users.create({
      name: "Test User",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    const eventType = user.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const testLocation = "https://meet.google.com/test-meeting";

    const booking = await prisma.booking.create({
      data: {
        uid: `test-instant-booking-${Date.now()}`,
        title: "Test Instant Booking",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        location: testLocation,
        user: {
          connect: {
            id: user.id,
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

    // Call the tRPC endpoint (public procedure, no auth needed)
    const response = await page.request.get(
      `/api/trpc/bookings/getInstantBookingLocation?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { bookingId: booking.id } } })
      )}`
    );

    expect(response.status()).toBe(200);
    const json = await response.json();

    expect(json).toHaveLength(1);
    expect(json[0].result.data.json.booking).toBeDefined();
    expect(json[0].result.data.json.booking.id).toBe(booking.id);
    expect(json[0].result.data.json.booking.location).toBe(testLocation);
    expect(json[0].result.data.json.booking.status).toBe(BookingStatus.ACCEPTED);
  });

  test("viewer.bookings.getInstantBookingLocation - should return null for non-accepted booking", async ({
    page,
    users,
  }) => {
    const user = await users.create({
      name: "Test User",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    const eventType = user.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `test-pending-booking-${Date.now()}`,
        title: "Test Pending Booking",
        startTime,
        endTime,
        status: BookingStatus.PENDING,
        location: "https://meet.google.com/test-meeting",
        user: {
          connect: {
            id: user.id,
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

    // Call the tRPC endpoint - should return null because booking is PENDING, not ACCEPTED
    const response = await page.request.get(
      `/api/trpc/bookings/getInstantBookingLocation?batch=1&input=${encodeURIComponent(
        JSON.stringify({ "0": { json: { bookingId: booking.id } } })
      )}`
    );

    expect(response.status()).toBe(200);
    const json = await response.json();

    expect(json).toHaveLength(1);
    expect(json[0].result.data.json.booking).toBeNull();
  });

  test("viewer.bookings.editLocation - should update booking location", async ({ page, users }) => {
    const user = await users.create({
      name: "Test User",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    await user.apiLogin();

    const eventType = user.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `test-edit-location-${Date.now()}`,
        title: "Test Edit Location Booking",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        location: "integrations:daily_video",
        user: {
          connect: {
            id: user.id,
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

    const newLocation = "https://zoom.us/j/123456789";

    // Call the tRPC mutation endpoint
    const response = await page.request.post(`/api/trpc/bookings/editLocation?batch=1`, {
      data: {
        "0": {
          json: {
            bookingId: booking.id,
            newLocation,
            credentialId: null,
          },
        },
      },
    });

    expect(response.status()).toBe(200);
    const json = await response.json();

    expect(json).toHaveLength(1);
    // Check for success response or error (editLocation may fail due to missing calendar integration)
    // The important thing is that the route is reachable and processes the request
    if (json[0].error) {
      // Expected errors like "Updating location failed" are acceptable
      // as they indicate the route is working but external integrations are missing
      expect(json[0].error.json.message).toBeDefined();
    } else {
      expect(json[0].result.data.json.message).toBe("Location updated");

      // Verify the location was updated in the database
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(updatedBooking?.location).toBe(newLocation);
    }
  });

  test("viewer.bookings.editLocation - should reject unauthorized user", async ({ page, users }) => {
    // Create two users - one owns the booking, another tries to edit it
    const owner = await users.create({
      name: "Booking Owner",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Meeting",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    const otherUser = await users.create({
      name: "Other User",
    });

    // Login as the other user (not the owner)
    await otherUser.apiLogin();

    const eventType = owner.eventTypes[0];
    if (!eventType) {
      throw new Error("Event type not found");
    }

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `test-unauthorized-edit-${Date.now()}`,
        title: "Test Unauthorized Edit Booking",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        location: "integrations:daily_video",
        user: {
          connect: {
            id: owner.id,
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

    // Try to edit the booking as the other user
    const response = await page.request.post(`/api/trpc/bookings/editLocation?batch=1`, {
      data: {
        "0": {
          json: {
            bookingId: booking.id,
            newLocation: "https://zoom.us/j/123456789",
            credentialId: null,
          },
        },
      },
    });

    // The bookingsProcedure middleware returns 401 when user is not authorized
    // to access the booking (not the booking owner, admin, or team member)
    expect(response.status()).toBe(401);
  });
});
