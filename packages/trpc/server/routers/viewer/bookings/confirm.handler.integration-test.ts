import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmHandler } from "./confirm.handler";

type ConfirmHandlerArgs = Parameters<typeof confirmHandler>[0];

const timestamp: number = Date.now();
const unique = (): string => randomBytes(4).toString("hex");

let organizer: User;
let unauthorizedUser: User;
let eventType: EventType;

const bookingIds: number[] = [];

function createArgs(u: User, bookingId: number, confirmed: boolean, reason?: string): ConfirmHandlerArgs {
  return {
    ctx: {
      user: {
        id: u.id,
        uuid: u.uuid,
        email: u.email,
        username: u.username,
        role: u.role,
        destinationCalendar: null,
      },
      traceContext: { traceId: "test-trace", spanId: "test-span", operation: "test" },
    },
    input: {
      bookingId,
      confirmed,
      reason,
      emailsEnabled: false,
      actionSource: "WEBAPP",
      actor: { identifiedBy: "user" as const, userUuid: u.uuid },
    },
  };
}

async function createPendingBooking(suffix: string): Promise<Booking> {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const booking = await prisma.booking.create({
    data: {
      uid: `confirm-${suffix}-${unique()}`,
      title: `Booking ${suffix}`,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
      userId: organizer.id,
      eventTypeId: eventType.id,
      status: BookingStatus.PENDING,
      attendees: {
        create: {
          email: `attendee-${suffix}-${unique()}@example.com`,
          name: `Attendee ${suffix}`,
          timeZone: "UTC",
        },
      },
    },
  });
  bookingIds.push(booking.id);
  return booking;
}

describe("confirm.handler - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `confirm-org-${timestamp}-${unique()}`,
        email: `confirm-org-${timestamp}-${unique()}@example.com`,
        name: "Confirm Organizer",
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        username: `confirm-unauth-${timestamp}-${unique()}`,
        email: `confirm-unauth-${timestamp}-${unique()}@example.com`,
        name: "Unauthorized User",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Confirm Event ${timestamp}`,
        slug: `confirm-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
        requiresConfirmation: true,
      },
    });
  });

  afterAll(async () => {
    try {
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (eventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: eventType.id } });
      }
      const userIds = [organizer?.id, unauthorizedUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should confirm a PENDING booking and persist ACCEPTED status in DB", async () => {
    const booking = await createPendingBooking("accept");

    const result = await confirmHandler(createArgs(organizer, booking.id, true));

    expect(result.message).toBe("Booking confirmed");
    expect(result.status).toBe(BookingStatus.ACCEPTED);

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.ACCEPTED);
  });

  it("should reject a PENDING booking, persist REJECTED status and rejectionReason in DB", async () => {
    const booking = await createPendingBooking("decline");
    const reason = "Schedule conflict - team offsite";

    const result = await confirmHandler(createArgs(organizer, booking.id, false, reason));

    expect(result.message).toBe("Booking rejected");
    expect(result.status).toBe(BookingStatus.REJECTED);

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rejectionReason: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.REJECTED);
    expect(dbBooking?.rejectionReason).toBe(reason);
  });

  it("should throw BAD_REQUEST when confirming an already-ACCEPTED booking", async () => {
    const booking = await createPendingBooking("already-accepted");
    // First, accept it
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.ACCEPTED },
    });

    const error = await confirmHandler(createArgs(organizer, booking.id, true)).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Booking already confirmed");
  });

  it("should throw UNAUTHORIZED when non-organizer user tries to confirm", async () => {
    const booking = await createPendingBooking("unauth-confirm");

    const error = await confirmHandler(createArgs(unauthorizedUser, booking.id, true)).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("User is not authorized to confirm this booking");

    // Booking should still be PENDING — no side effects from failed attempt
    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.PENDING);
  });

  it("should throw UNAUTHORIZED when non-organizer user tries to reject", async () => {
    const booking = await createPendingBooking("unauth-reject");

    const error = await confirmHandler(
      createArgs(unauthorizedUser, booking.id, false, "not your booking")
    ).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("User is not authorized to confirm this booking");

    // Booking must remain PENDING
    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rejectionReason: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.PENDING);
    expect(dbBooking?.rejectionReason).toBeNull();
  });

  it("should use atomic claim: second concurrent confirm of the same booking throws", async () => {
    const booking = await createPendingBooking("atomic-claim");

    // First confirm succeeds
    const first = await confirmHandler(createArgs(organizer, booking.id, true));
    expect(first.status).toBe(BookingStatus.ACCEPTED);

    // Second confirm on same booking should fail with BAD_REQUEST
    const error = await confirmHandler(createArgs(organizer, booking.id, true)).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Booking already confirmed");
  });

  it("should reject without a reason and persist null rejectionReason", async () => {
    const booking = await createPendingBooking("no-reason-reject");

    const result = await confirmHandler(createArgs(organizer, booking.id, false));

    expect(result.status).toBe(BookingStatus.REJECTED);

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { rejectionReason: true, status: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.REJECTED);
    expect(dbBooking?.rejectionReason).toBeNull();
  });

  it("should throw when booking has no organizer user", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const orphanBooking = await prisma.booking.create({
      data: {
        uid: `confirm-orphan-${unique()}`,
        title: "Orphan Booking",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: null,
        eventTypeId: eventType.id,
        status: BookingStatus.PENDING,
        attendees: {
          create: {
            email: `attendee-orphan-${unique()}@example.com`,
            name: "Orphan Attendee",
            timeZone: "UTC",
          },
        },
      },
    });
    bookingIds.push(orphanBooking.id);

    const error = await confirmHandler(createArgs(organizer, orphanBooking.id, true)).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Booking must have an organizer");
  });

  it("should reject all recurring bookings when recurringEventId is provided", async () => {
    const recurringId = `recurring-${unique()}`;
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create a series of recurring PENDING bookings
    const recurringBookings = await Promise.all(
      [0, 1, 2].map(async (i) => {
        const b = await prisma.booking.create({
          data: {
            uid: `confirm-recur-${unique()}`,
            title: `Recurring Booking ${i}`,
            startTime: new Date(futureDate.getTime() + i * 7 * 24 * 60 * 60 * 1000),
            endTime: new Date(futureDate.getTime() + i * 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            userId: organizer.id,
            eventTypeId: eventType.id,
            status: BookingStatus.PENDING,
            recurringEventId: recurringId,
            attendees: {
              create: {
                email: `attendee-recur-${unique()}@example.com`,
                name: `Recurring Attendee ${i}`,
                timeZone: "UTC",
              },
            },
          },
        });
        bookingIds.push(b.id);
        return b;
      })
    );

    // Reject with recurringEventId — should reject all in the series
    const args = createArgs(organizer, recurringBookings[0].id, false, "Recurring series cancelled");
    args.input.recurringEventId = recurringId;
    const result = await confirmHandler(args);

    expect(result.status).toBe(BookingStatus.REJECTED);

    // All 3 bookings should now be REJECTED
    const dbBookings = await prisma.booking.findMany({
      where: { recurringEventId: recurringId },
      select: { status: true, rejectionReason: true },
    });
    expect(dbBookings).toHaveLength(3);
    for (const b of dbBookings) {
      expect(b.status).toBe(BookingStatus.REJECTED);
      expect(b.rejectionReason).toBe("Recurring series cancelled");
    }
  });
});
