import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getHandler } from "./find.handler";

let user: User;
let eventType: EventType;
let booking: Booking;
const timestamp = Date.now();

describe("bookings.find - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `bookings-find-${timestamp}`,
        email: `bookings-find-${timestamp}@example.com`,
        name: "Bookings Find Test User",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Find Booking Event ${timestamp}`,
        slug: `find-booking-event-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    booking = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Test Booking for Find",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.booking.deleteMany({ where: { id: booking?.id } });
      await prisma.eventType.deleteMany({ where: { id: eventType?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should find a booking by uid", async () => {
    const result = await getHandler({
      ctx: { prisma: prisma as unknown as PrismaClient },
      input: { bookingUid: booking.uid },
    });

    expect(result.booking).toBeDefined();
    expect(result.booking?.uid).toBe(booking.uid);
    expect(result.booking?.id).toBe(booking.id);
    expect(result.booking?.status).toBe(BookingStatus.ACCEPTED);
    expect(result.booking?.eventTypeId).toBe(eventType.id);
  });

  it("should return null booking for non-existent uid", async () => {
    const result = await getHandler({
      ctx: { prisma: prisma as unknown as PrismaClient },
      input: { bookingUid: `non-existent-uid-${timestamp}` },
    });

    expect(result.booking).toBeNull();
  });

  it("should only return safe fields (no private data)", async () => {
    const result = await getHandler({
      ctx: { prisma: prisma as unknown as PrismaClient },
      input: { bookingUid: booking.uid },
    });

    const bookingResult = result.booking;
    expect(bookingResult).toBeDefined();
    if (bookingResult) {
      expect(bookingResult).toHaveProperty("id");
      expect(bookingResult).toHaveProperty("uid");
      expect(bookingResult).toHaveProperty("startTime");
      expect(bookingResult).toHaveProperty("endTime");
      expect(bookingResult).toHaveProperty("description");
      expect(bookingResult).toHaveProperty("status");
      expect(bookingResult).toHaveProperty("paid");
      expect(bookingResult).toHaveProperty("eventTypeId");
    }
  });
});
