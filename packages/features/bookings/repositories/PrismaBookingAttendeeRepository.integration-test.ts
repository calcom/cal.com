import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaBookingAttendeeRepository } from "./PrismaBookingAttendeeRepository";

let testUserId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
const createdBookingIds: number[] = [];
let bookingTimeOffset = 0;

async function cleanup() {
  if (createdBookingIds.length > 0) {
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds } },
    });
    createdBookingIds.length = 0;
  }
}

async function createTestBookingWithAttendees(uid: string, attendeeCount: number) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `booking-uid-${randomString()}`,
      title: "Test Booking",
      startTime: new Date(`2025-06-16T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-16T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);

  for (let i = 0; i < attendeeCount; i++) {
    await prisma.attendee.create({
      data: {
        email: `attendee-${i}-${randomString()}@test.com`,
        name: `Attendee ${i}`,
        timeZone: "UTC",
        bookingId: booking.id,
      },
    });
  }

  return booking;
}

describe("PrismaBookingAttendeeRepository (Integration Tests)", () => {
  let repo: PrismaBookingAttendeeRepository;

  beforeAll(async () => {
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    let eventType = await prisma.eventType.findFirst({
      where: { userId: testUserId },
    });

    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: {
          title: "Attendee Delete Test Event",
          slug: `attendee-del-test-${randomString()}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    repo = new PrismaBookingAttendeeRepository(prisma);
  });

  afterAll(async () => {
    await cleanup();
    if (createdEventType && testEventTypeId) {
      await prisma.eventType.delete({ where: { id: testEventTypeId } }).catch(() => {});
    }
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("deleteManyByBookingId", () => {
    it("deletes all attendees for a given booking id", async () => {
      const booking = await createTestBookingWithAttendees("del-1", 3);

      // Verify attendees exist
      const beforeCount = await prisma.attendee.count({ where: { bookingId: booking.id } });
      expect(beforeCount).toBe(3);

      await repo.deleteManyByBookingId(booking.id);

      // Verify all attendees were deleted
      const afterCount = await prisma.attendee.count({ where: { bookingId: booking.id } });
      expect(afterCount).toBe(0);
    });

    it("returns void even when no attendees exist", async () => {
      const offset = bookingTimeOffset++;
      const booking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Empty Booking",
          startTime: new Date(`2025-06-16T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-16T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
          userId: testUserId,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
        },
      });
      createdBookingIds.push(booking.id);

      const result = await repo.deleteManyByBookingId(booking.id);

      expect(result).toBeUndefined();
    });

    it("does not affect attendees of other bookings", async () => {
      const booking1 = await createTestBookingWithAttendees("del-iso-1", 2);
      const booking2 = await createTestBookingWithAttendees("del-iso-2", 3);

      await repo.deleteManyByBookingId(booking1.id);

      // booking1 attendees should be gone
      const b1Count = await prisma.attendee.count({ where: { bookingId: booking1.id } });
      expect(b1Count).toBe(0);

      // booking2 attendees should remain
      const b2Count = await prisma.attendee.count({ where: { bookingId: booking2.id } });
      expect(b2Count).toBe(3);
    });
  });
});
