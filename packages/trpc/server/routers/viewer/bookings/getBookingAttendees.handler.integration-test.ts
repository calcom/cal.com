import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import type { Attendee, Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getBookingAttendeesHandler } from "./getBookingAttendees.handler";

let user: User;
let eventType: EventType;
let booking: Booking;
let attendee1: Attendee;
let attendee2: Attendee;
let seatReferenceUid: string;
const timestamp = Date.now();

describe("bookings.getBookingAttendees - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `bookings-attendees-${timestamp}`,
        email: `bookings-attendees-${timestamp}@example.com`,
        name: "Booking Attendees Test User",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Attendees Event ${timestamp}`,
        slug: `attendees-event-${timestamp}`,
        length: 30,
        userId: user.id,
        seatsPerTimeSlot: 5,
      },
    });

    booking = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Seats Booking",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });

    // Create real attendees (required for BookingSeat FK constraint)
    attendee1 = await prisma.attendee.create({
      data: {
        email: `seat-attendee-1-${timestamp}@example.com`,
        name: "Seat Attendee 1",
        timeZone: "UTC",
        bookingId: booking.id,
      },
    });

    attendee2 = await prisma.attendee.create({
      data: {
        email: `seat-attendee-2-${timestamp}@example.com`,
        name: "Seat Attendee 2",
        timeZone: "UTC",
        bookingId: booking.id,
      },
    });

    seatReferenceUid = `seat-ref-${timestamp}`;
    await prisma.bookingSeat.create({
      data: {
        referenceUid: seatReferenceUid,
        bookingId: booking.id,
        attendeeId: attendee1.id,
        data: {},
      },
    });

    // Create a second seat reference
    await prisma.bookingSeat.create({
      data: {
        referenceUid: `seat-ref-2-${timestamp}`,
        bookingId: booking.id,
        attendeeId: attendee2.id,
        data: {},
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.bookingSeat.deleteMany({ where: { bookingId: booking?.id } });
      await prisma.attendee.deleteMany({
        where: { id: { in: [attendee1?.id, attendee2?.id].filter(Boolean) } },
      });
      await prisma.booking.deleteMany({ where: { id: booking?.id } });
      await prisma.eventType.deleteMany({ where: { id: eventType?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return the count of seat references for a booking", async () => {
    const count = await getBookingAttendeesHandler({
      ctx: {},
      input: { seatReferenceUid },
    });

    expect(count).toBe(2);
  });

  it("should throw when seat reference uid does not exist", async () => {
    await expect(
      getBookingAttendeesHandler({
        ctx: {},
        input: { seatReferenceUid: `non-existent-seat-${timestamp}` },
      })
    ).rejects.toThrow();
  });
});
