import { randomBytes } from "node:crypto";
import prisma from "@calcom/prisma";
import type { Booking, EventType, User } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestRescheduleHandler } from "./requestReschedule.handler";

const timestamp = Date.now();
const unique = () => randomBytes(4).toString("hex");

let organizer: User;
let otherUser: User;
let eventType: EventType;

const bookingIds: number[] = [];

function makeCtx(u: User) {
  return {
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      username: u.username,
      locale: u.locale ?? "en",
      timeZone: u.timeZone,
      uuid: u.uuid,
    },
  };
}

async function createBookingWithStatus(
  suffix: string,
  status: BookingStatus,
  owner: User = organizer
): Promise<Booking> {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const booking = await prisma.booking.create({
    data: {
      uid: `resched-${suffix}-${unique()}`,
      title: `Booking ${suffix}`,
      startTime: futureDate,
      endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
      userId: owner.id,
      eventTypeId: eventType.id,
      status,
      attendees: {
        create: {
          email: `resched-att-${suffix}-${unique()}@example.com`,
          name: `Attendee ${suffix}`,
          timeZone: "UTC",
        },
      },
    },
  });
  bookingIds.push(booking.id);
  return booking;
}

describe("requestReschedule.handler - integration", () => {
  beforeAll(async () => {
    organizer = await prisma.user.create({
      data: {
        username: `resched-org-${timestamp}-${unique()}`,
        email: `resched-org-${timestamp}-${unique()}@example.com`,
        name: "Reschedule Organizer",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        username: `resched-other-${timestamp}-${unique()}`,
        email: `resched-other-${timestamp}-${unique()}@example.com`,
        name: "Other User",
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: `Reschedule Event ${timestamp}`,
        slug: `resched-event-${timestamp}-${unique()}`,
        length: 30,
        userId: organizer.id,
      },
    });
  });

  afterAll(async () => {
    try {
      if (bookingIds.length > 0) {
        const bookings = await prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          select: { uid: true },
        });
        const uids = bookings.map((b) => b.uid);
        if (uids.length > 0) {
          await prisma.workflowReminder.deleteMany({ where: { bookingUid: { in: uids } } });
        }
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.bookingReference.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (eventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: eventType.id } });
      }
      const userIds = [organizer?.id, otherUser?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  it("should set CANCELLED + rescheduled=true + cancellationReason + cancelledBy on valid reschedule", async () => {
    const booking = await createBookingWithStatus("valid", BookingStatus.ACCEPTED);

    await requestRescheduleHandler({
      ctx: makeCtx(organizer),
      input: {
        bookingUid: booking.uid,
        rescheduleReason: "Need to move this meeting",
      },
      source: "WEBAPP" as const,
    });

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rescheduled: true, cancellationReason: true, cancelledBy: true },
    });

    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(dbBooking?.rescheduled).toBe(true);
    expect(dbBooking?.cancellationReason).toBe("Need to move this meeting");
    expect(dbBooking?.cancelledBy).toBe(organizer.email);
  });

  it("should throw FORBIDDEN when non-owner requests reschedule on a personal (non-team) booking", async () => {
    const booking = await createBookingWithStatus("forbidden", BookingStatus.ACCEPTED);

    const error = await requestRescheduleHandler({
      ctx: makeCtx(otherUser),
      input: { bookingUid: booking.uid },
      source: "WEBAPP" as const,
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("User isn't owner of the current booking");

    // Booking must remain ACCEPTED — no side effects from unauthorized attempt
    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rescheduled: true },
    });
    expect(dbBooking?.status).toBe(BookingStatus.ACCEPTED);
    expect(dbBooking?.rescheduled).toBeNull();
  });

  it("should throw BAD_REQUEST when booking is already CANCELLED", async () => {
    const booking = await createBookingWithStatus("cancelled", BookingStatus.CANCELLED);

    await expect(
      requestRescheduleHandler({
        ctx: makeCtx(organizer),
        input: { bookingUid: booking.uid },
        source: "WEBAPP" as const,
      })
    ).rejects.toThrow("Cannot request reschedule for cancelled or rejected booking");
  });

  it("should throw BAD_REQUEST when booking is already REJECTED", async () => {
    const booking = await createBookingWithStatus("rejected", BookingStatus.REJECTED);

    await expect(
      requestRescheduleHandler({
        ctx: makeCtx(organizer),
        input: { bookingUid: booking.uid },
        source: "WEBAPP" as const,
      })
    ).rejects.toThrow("Cannot request reschedule for cancelled or rejected booking");
  });

  it("should allow reschedule with an empty reason and still persist the state change", async () => {
    const booking = await createBookingWithStatus("empty-reason", BookingStatus.ACCEPTED);

    await requestRescheduleHandler({
      ctx: makeCtx(organizer),
      input: {
        bookingUid: booking.uid,
        rescheduleReason: "",
      },
      source: "WEBAPP" as const,
    });

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rescheduled: true, cancellationReason: true },
    });

    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(dbBooking?.rescheduled).toBe(true);
  });

  it("should also work for a PENDING booking (pre-confirmation reschedule)", async () => {
    const booking = await createBookingWithStatus("pending-resched", BookingStatus.PENDING);

    await requestRescheduleHandler({
      ctx: makeCtx(organizer),
      input: {
        bookingUid: booking.uid,
        rescheduleReason: "Changed my mind before confirmation",
      },
      source: "WEBAPP" as const,
    });

    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, rescheduled: true, cancellationReason: true },
    });

    expect(dbBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(dbBooking?.rescheduled).toBe(true);
    expect(dbBooking?.cancellationReason).toBe("Changed my mind before confirmation");
  });
});
