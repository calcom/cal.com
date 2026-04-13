import { randomBytes } from "node:crypto";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let eventType: EventType;

const bookingIds: number[] = [];
const extraEventTypeIds: number[] = [];

async function createBooking(
  suffix: string,
  status: BookingStatus,
  opts?: { recurringEventId?: string; startTime?: Date; endTime?: Date; eventTypeId?: number }
): Promise<Booking> {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const start = opts?.startTime ?? futureDate;
  const booking = await prisma.booking.create({
    data: {
      uid: `cancel-${suffix}-${unique()}`,
      title: `Cancel Booking ${suffix}`,
      startTime: start,
      endTime: opts?.endTime ?? new Date(start.getTime() + 30 * 60 * 1000),
      userId: organizer.id,
      eventTypeId: opts?.eventTypeId ?? eventType.id,
      status,
      recurringEventId: opts?.recurringEventId ?? null,
      idempotencyKey: `cancel-idem-${timestamp}-${suffix}-${unique()}`,
      attendees: {
        create: {
          email: `cancel-att-${suffix}-${unique()}@example.com`,
          name: `Attendee ${suffix}`,
          timeZone: "UTC",
        },
      },
    },
  });
  bookingIds.push(booking.id);
  return booking;
}

describe("handleCancelBooking - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `cancel-org-${timestamp}-${unique()}`,
        email: `cancel-org-${timestamp}-${unique()}@example.com`,
        name: "Cancel Organizer",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Cancel Event ${timestamp}`,
        slug: `cancel-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
      },
    });
  });

  afterAll(async () => {
    try {
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.bookingReference.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      const allEventTypeIds = [...(eventType?.id ? [eventType.id] : []), ...extraEventTypeIds];
      if (allEventTypeIds.length > 0) {
        await prisma.eventType.deleteMany({ where: { id: { in: allEventTypeIds } } });
      }
      if (organizer?.id) {
        await prisma.user.deleteMany({ where: { id: organizer.id } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should cancel a single ACCEPTED booking and persist CANCELLED status + cancellationReason", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const booking = await createBooking("single", BookingStatus.ACCEPTED);

    await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: {
        id: booking.id,
        cancellationReason: "No longer needed",
      },
      actionSource: "WEBAPP",
    });

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, cancellationReason: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(dbBooking?.cancellationReason).toBe("No longer needed");
  });

  it("should throw HttpError 400 when cancelling an already-CANCELLED booking", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const booking = await createBooking("already-cancelled", BookingStatus.CANCELLED);

    const error = await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: { id: booking.id },
      actionSource: "WEBAPP",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
    expect((error as HttpError).message).toBe("This booking has already been cancelled.");
  });

  it("should cancel all remaining recurring bookings when allRemainingBookings is true", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const recurringId = `recurring-cancel-${unique()}`;

    // Create event type with recurringEvent so the handler enters the bulk-cancel branch
    const recurringEventType = await prisma.eventType.create({
      data: {
        title: `Recurring Cancel Event ${timestamp}`,
        slug: `recurring-cancel-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
        recurringEvent: { interval: 1, count: 3, freq: 2 },
      },
    });
    extraEventTypeIds.push(recurringEventType.id);

    const bookings: Booking[] = [];
    for (const i of [0, 1, 2]) {
      bookings.push(
        await createBooking(`recurring-${i}`, BookingStatus.ACCEPTED, {
          recurringEventId: recurringId,
          eventTypeId: recurringEventType.id,
        })
      );
    }

    // Cancel the first one with allRemainingBookings
    await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: {
        id: bookings[0].id,
        allRemainingBookings: true,
        cancellationReason: "Series cancelled",
      },
      actionSource: "WEBAPP",
    });

    // All bookings with this recurringEventId should be CANCELLED
    const dbBookings = await prisma.booking.findMany({
      where: { recurringEventId: recurringId },
      select: { status: true, cancellationReason: true },
    });
    for (const b of dbBookings) {
      expect(b.status).toBe(BookingStatus.CANCELLED);
    }
  });

  it("should throw HttpError 400 when booking has already ended (past endTime)", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 60 * 60 * 1000);
    const booking = await createBooking("past-booking", BookingStatus.ACCEPTED, {
      startTime: pastStart,
      endTime: pastEnd,
    });

    const error = await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: { id: booking.id, cancellationReason: "Testing past endTime" },
      actionSource: "WEBAPP",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
    expect((error as HttpError).message).toBe("Cannot cancel a booking that has already ended");
  });

  it("should throw when booking has no user assigned", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const orphanBooking = await prisma.booking.create({
      data: {
        uid: `cancel-orphan-${unique()}`,
        title: "Orphan Cancel",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: null,
        eventTypeId: eventType.id,
        status: BookingStatus.ACCEPTED,
        idempotencyKey: `cancel-idem-orphan-${timestamp}-${unique()}`,
        attendees: {
          create: {
            email: `cancel-att-orphan-${unique()}@example.com`,
            name: "Orphan Attendee",
            timeZone: "UTC",
          },
        },
      },
    });
    bookingIds.push(orphanBooking.id);

    const error = await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: { id: orphanBooking.id },
      actionSource: "WEBAPP",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
    expect((error as HttpError).message).toBe("User not found");
  });

  it("should preserve attendees for record-keeping after single booking cancellation", async () => {
    const { default: handler } = await import("./handleCancelBooking");
    const booking = await createBooking("attendee-preserve", BookingStatus.ACCEPTED);

    const attendeesBefore = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: { id: true, email: true },
    });
    expect(attendeesBefore.length).toBeGreaterThan(0);

    await handler({
      userId: organizer.id,
      userUuid: organizer.uuid,
      bookingData: {
        id: booking.id,
        cancellationReason: "Checking attendee preservation",
      },
      actionSource: "WEBAPP",
    });

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);

    // Attendees are preserved after cancellation for audit/notification purposes
    const attendeesAfter = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: { id: true, email: true },
    });
    expect(attendeesAfter.length).toBe(attendeesBefore.length);
    expect(attendeesAfter.map((a) => a.email).sort()).toEqual(attendeesBefore.map((a) => a.email).sort());
  });
});
