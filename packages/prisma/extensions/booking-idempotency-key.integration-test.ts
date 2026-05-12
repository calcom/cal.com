import { prisma } from "@calcom/prisma";
import { BookingStatus, CreationSource } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const createdBookingIds: number[] = [];
const createdEventTypeIds: number[] = [];
const createdUserIds: number[] = [];

describe("bookingIdempotencyKeyExtension (Integration Tests)", () => {
  const timestamp = Date.now();
  let organizerId: number;
  let eventTypeId: number;

  // Same slot used across all tests so we exercise the deterministic-key collision path
  const startTime = new Date("2030-06-01T10:00:00.000Z");
  const endTime = new Date("2030-06-01T10:30:00.000Z");

  beforeAll(async () => {
    const organizer = await prisma.user.create({
      data: {
        email: `idempotency-key-${timestamp}@test.com`,
        username: `idempotency-key-${timestamp}`,
        name: "Test Organizer",
        timeZone: "UTC",
        locale: "en",
        creationSource: CreationSource.WEBAPP,
      },
      select: { id: true },
    });
    organizerId = organizer.id;
    createdUserIds.push(organizer.id);

    const eventType = await prisma.eventType.create({
      data: {
        title: `idempotency-key-event-${timestamp}`,
        slug: `idempotency-key-event-${timestamp}`,
        length: 30,
        userId: organizerId,
      },
      select: { id: true },
    });
    eventTypeId = eventType.id;
    createdEventTypeIds.push(eventType.id);
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
    }
    if (createdEventTypeIds.length > 0) {
      await prisma.eventType.deleteMany({ where: { id: { in: createdEventTypeIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("stamps a deterministic idempotencyKey when a booking is created with status ACCEPTED", async () => {
    const booking = await prisma.booking.create({
      data: {
        uid: `idem-create-${timestamp}`,
        title: "First booking",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(booking.id);

    expect(booking.idempotencyKey).not.toBeNull();
  });

  it("clears the idempotencyKey when a booking is updated to CANCELLED", async () => {
    const before = await prisma.booking.findFirstOrThrow({
      where: { uid: `idem-create-${timestamp}` },
      select: { id: true, idempotencyKey: true },
    });
    expect(before.idempotencyKey).not.toBeNull();

    await prisma.booking.update({
      where: { id: before.id },
      data: { status: BookingStatus.CANCELLED },
    });

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: before.id },
      select: { idempotencyKey: true },
    });
    expect(after.idempotencyKey).toBeNull();
  });

  it("allows a fresh ACCEPTED booking on the same slot+user after the prior booking was CANCELLED (repro for #29291)", async () => {
    // Sanity check: the prior booking from earlier tests is cancelled
    const priorCancelled = await prisma.booking.findFirstOrThrow({
      where: { uid: `idem-create-${timestamp}` },
      select: { status: true, idempotencyKey: true },
    });
    expect(priorCancelled.status).toBe(BookingStatus.CANCELLED);
    expect(priorCancelled.idempotencyKey).toBeNull();

    // This must NOT throw P2002. Because the deterministic key is
    // uuidv5(start.end.userId), it will be identical to the prior booking's
    // stamped key. The extension is supposed to have nulled the prior one
    // on cancel, leaving the slot free for a new ACCEPTED booking.
    const second = await prisma.booking.create({
      data: {
        uid: `idem-rebook-${timestamp}`,
        title: "Rebooking same slot after cancel",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(second.id);

    expect(second.idempotencyKey).not.toBeNull();
  });

  it("also clears the idempotencyKey when updateMany sets status to CANCELLED", async () => {
    // Create a second ACCEPTED booking at a DIFFERENT slot so we don't collide with prior tests
    const altStart = new Date("2030-06-02T10:00:00.000Z");
    const altEnd = new Date("2030-06-02T10:30:00.000Z");

    const booking = await prisma.booking.create({
      data: {
        uid: `idem-updatemany-${timestamp}`,
        title: "updateMany target",
        startTime: altStart,
        endTime: altEnd,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(booking.id);
    expect(booking.idempotencyKey).not.toBeNull();

    await prisma.booking.updateMany({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { idempotencyKey: true },
    });
    expect(after.idempotencyKey).toBeNull();
  });

  it("stamps a key on PENDING create so the slot is protected while awaiting host confirmation", async () => {
    const slotStart = new Date("2030-06-03T10:00:00.000Z");
    const slotEnd = new Date("2030-06-03T10:30:00.000Z");

    const booking = await prisma.booking.create({
      data: {
        uid: `idem-pending-${timestamp}`,
        title: "Pending confirmation booking",
        startTime: slotStart,
        endTime: slotEnd,
        status: BookingStatus.PENDING,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(booking.id);

    expect(booking.idempotencyKey).not.toBeNull();
  });

  it("preserves the existing key when a PENDING booking is confirmed to ACCEPTED via update", async () => {
    // Reuses the PENDING booking from the previous test. Because PENDING
    // creates are now stamped on create, the host's confirmation update is a
    // no-op for the key: the row keeps the key it received at create time and
    // the unique constraint continues to protect the slot.
    const pendingBooking = await prisma.booking.findFirstOrThrow({
      where: { uid: `idem-pending-${timestamp}` },
      select: { id: true, idempotencyKey: true, status: true },
    });
    expect(pendingBooking.status).toBe(BookingStatus.PENDING);
    expect(pendingBooking.idempotencyKey).not.toBeNull();
    const keyBeforeConfirm = pendingBooking.idempotencyKey;

    await prisma.booking.update({
      where: { id: pendingBooking.id },
      data: { status: BookingStatus.ACCEPTED },
    });

    const afterConfirm = await prisma.booking.findUniqueOrThrow({
      where: { id: pendingBooking.id },
      select: { idempotencyKey: true, status: true },
    });
    expect(afterConfirm.status).toBe(BookingStatus.ACCEPTED);
    expect(afterConfirm.idempotencyKey).toBe(keyBeforeConfirm);
  });

  it("clears the idempotencyKey when a booking is REJECTED (extension covers both terminal states)", async () => {
    const slotStart = new Date("2030-06-04T10:00:00.000Z");
    const slotEnd = new Date("2030-06-04T10:30:00.000Z");

    const booking = await prisma.booking.create({
      data: {
        uid: `idem-reject-${timestamp}`,
        title: "Will be rejected",
        startTime: slotStart,
        endTime: slotEnd,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(booking.id);
    expect(booking.idempotencyKey).not.toBeNull();

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.REJECTED },
    });

    const after = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
      select: { idempotencyKey: true },
    });
    expect(after.idempotencyKey).toBeNull();
  });

  it("generates DIFFERENT keys for the same slot+user when reassignById differs (round-robin reassignment)", async () => {
    const slotStart = new Date("2030-06-05T10:00:00.000Z");
    const slotEnd = new Date("2030-06-05T10:30:00.000Z");

    // First booking, no reassignment
    const first = await prisma.booking.create({
      data: {
        uid: `idem-reassign-1-${timestamp}`,
        title: "Original assignment",
        startTime: slotStart,
        endTime: slotEnd,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(first.id);

    // Cancel first so the slot is free
    await prisma.booking.update({
      where: { id: first.id },
      data: { status: BookingStatus.CANCELLED },
    });

    // Re-book at same slot+user but with reassignById set: the key should differ
    // from what `first` would have produced again, demonstrating the reassignment
    // is correctly factored into the deterministic key.
    const second = await prisma.booking.create({
      data: {
        uid: `idem-reassign-2-${timestamp}`,
        title: "Reassigned target",
        startTime: slotStart,
        endTime: slotEnd,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: organizerId } },
        reassignBy: { connect: { id: organizerId } },
        eventType: { connect: { id: eventTypeId } },
      },
      select: { id: true, idempotencyKey: true },
    });
    createdBookingIds.push(second.id);

    expect(second.idempotencyKey).not.toBeNull();
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
});
