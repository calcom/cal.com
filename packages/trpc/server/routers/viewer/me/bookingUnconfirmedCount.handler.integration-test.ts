import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bookingUnconfirmedCountHandler } from "./bookingUnconfirmedCount.handler";

let user: User;
const timestamp = Date.now();
const createdBookingIds: number[] = [];

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

describe("me.bookingUnconfirmedCount - integration", () => {
  beforeAll(async () => {
    user = await prisma.user.create({
      data: {
        username: `me-unconfirmed-${timestamp}`,
        email: `me-unconfirmed-${timestamp}@example.com`,
        name: "Unconfirmed Count Test User",
      },
    });

    const eventType = await prisma.eventType.create({
      data: {
        title: `Unconfirmed Event ${timestamp}`,
        slug: `unconfirmed-event-${timestamp}`,
        length: 30,
        userId: user.id,
      },
    });

    // Create pending bookings in the future
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < 3; i++) {
      const booking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: `Pending Booking ${i}`,
          startTime: new Date(futureDate.getTime() + i * 60 * 60 * 1000),
          endTime: new Date(futureDate.getTime() + i * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user.id,
          eventTypeId: eventType.id,
          status: BookingStatus.PENDING,
        },
      });
      createdBookingIds.push(booking.id);
    }

    // Create an accepted booking (should NOT be counted)
    const acceptedBooking = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Accepted Booking",
        startTime: new Date(futureDate.getTime() + 4 * 60 * 60 * 1000),
        endTime: new Date(futureDate.getTime() + 4 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user.id,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
      },
    });
    createdBookingIds.push(acceptedBooking.id);
  });

  afterAll(async () => {
    try {
      if (createdBookingIds.length > 0) {
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      }
      await prisma.eventType.deleteMany({ where: { userId: user?.id } });
      await prisma.user.deleteMany({ where: { id: user?.id } });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should return count of unconfirmed (pending) future bookings", async () => {
    const count = await bookingUnconfirmedCountHandler({
      ctx: createCtx(user),
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("should return 0 for user with no pending bookings", async () => {
    const emptyUser = await prisma.user.create({
      data: {
        username: `me-unconfirmed-empty-${timestamp}`,
        email: `me-unconfirmed-empty-${timestamp}@example.com`,
        name: "No Pending Bookings User",
      },
    });

    try {
      const count = await bookingUnconfirmedCountHandler({
        ctx: createCtx(emptyUser),
      });
      expect(count).toBe(0);
    } finally {
      await prisma.user.deleteMany({ where: { id: emptyUser.id } });
    }
  });
});
