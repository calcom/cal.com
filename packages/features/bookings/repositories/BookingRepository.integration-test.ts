import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BookingRepository } from "./BookingRepository";

const suffix = `${Date.now()}`;
const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);

let hostId: number;
let blockingEventTypeId: number;
let nonBlockingEventTypeId: number;
let otherEventTypeId: number;
const bookingIds: number[] = [];

async function createEventType(slug: string, data: { requiresConfirmationWillBlockSlot?: boolean }) {
  return prisma.eventType.create({
    data: {
      title: slug,
      slug: `${slug}-${suffix}`,
      length: 15,
      userId: hostId,
      requiresConfirmation: data.requiresConfirmationWillBlockSlot !== undefined,
      requiresConfirmationWillBlockSlot: data.requiresConfirmationWillBlockSlot ?? false,
    },
    select: { id: true },
  });
}

async function createPendingBooking(eventTypeId: number) {
  return prisma.booking.create({
    data: {
      uid: `pending-${eventTypeId}-${suffix}`,
      title: "Pending booking",
      userId: hostId,
      eventTypeId,
      status: BookingStatus.PENDING,
      startTime,
      endTime,
    },
    select: { id: true },
  });
}

describe("BookingRepository.findAllExistingBookingsForEventTypeBetween (Integration)", () => {
  beforeAll(async () => {
    const host = await prisma.user.create({
      data: { email: `pending-block-${suffix}@example.com`, username: `pending-block-${suffix}` },
      select: { id: true },
    });
    hostId = host.id;

    blockingEventTypeId = (await createEventType("blocking", { requiresConfirmationWillBlockSlot: true })).id;
    nonBlockingEventTypeId = (
      await createEventType("non-blocking", { requiresConfirmationWillBlockSlot: false })
    ).id;
    otherEventTypeId = (await createEventType("other", {})).id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    await prisma.eventType.deleteMany({ where: { userId: hostId } });
    await prisma.user.delete({ where: { id: hostId } });
  });

  const findBookings = (eventTypeId: number) =>
    new BookingRepository(prisma).findAllExistingBookingsForEventTypeBetween({
      startDate: new Date(startTime.getTime() - 60 * 60 * 1000),
      endDate: new Date(endTime.getTime() + 60 * 60 * 1000),
      eventTypeId,
      userIdAndEmailMap: new Map([[hostId, `pending-block-${suffix}@example.com`]]),
    });

  it("returns a blocking pending booking when a different event type of the host is being booked", async () => {
    const pending = await createPendingBooking(blockingEventTypeId);
    bookingIds.push(pending.id);

    const bookings = await findBookings(otherEventTypeId);

    expect(bookings.map((booking) => booking.id)).toEqual([pending.id]);
  });

  it("ignores a pending booking whose event type does not block slots", async () => {
    const pending = await createPendingBooking(nonBlockingEventTypeId);
    bookingIds.push(pending.id);

    const bookings = await findBookings(otherEventTypeId);

    expect(bookings.map((booking) => booking.id)).not.toContain(pending.id);
  });
});
