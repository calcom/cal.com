import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getBookingDetailsHandler } from "./getBookingDetails.handler";

let user: User;
let eventType: EventType;
let booking: Booking;
const timestamp = Date.now();

function createCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      organizationId: null,
      organization: { id: null, isOrgAdmin: false, metadata: {}, requestedSlug: null },
      profile: {
        id: u.id,
        upId: `usr-${u.id}`,
        username: u.username ?? "",
        userId: u.id,
        organizationId: null,
        organization: null,
      },
    } as unknown as NonNullable<TrpcSessionUser>,
  };
}

describe("bookings.getBookingDetails - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `bookings-details-${timestamp}`,
        email: `bookings-details-${timestamp}@example.com`,
        name: "Booking Details Test User",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Details Event ${timestamp}`,
        slug: `details-event-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    booking = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Details Test Booking",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: `attendee-${timestamp}@example.com`,
            name: "Test Attendee",
            timeZone: "UTC",
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.attendee.deleteMany({ where: { bookingId: booking?.id } });
      await prisma.booking.deleteMany({ where: { id: booking?.id } });
      await prisma.eventType.deleteMany({ where: { id: eventType?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return booking details for the booking owner", async () => {
    const result = await getBookingDetailsHandler({
      ctx: createCtx(user),
      input: { uid: booking.uid },
    });

    expect(result).toBeDefined();
  });

  it("should throw for non-existent booking uid", async () => {
    await expect(
      getBookingDetailsHandler({
        ctx: createCtx(user),
        input: { uid: `non-existent-${timestamp}` },
      })
    ).rejects.toThrow();
  });
});
