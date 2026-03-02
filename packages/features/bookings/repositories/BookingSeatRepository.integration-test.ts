import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BookingSeatRepository } from "./BookingSeatRepository";

let testUserId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
const createdBookingIds: number[] = [];
let bookingTimeOffset = 0;

async function cleanup() {
  if (createdBookingIds.length > 0) {
    // BookingSeat and Attendee cascade on booking delete
    await prisma.bookingSeat.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.attendee.deleteMany({
      where: { bookingId: { in: createdBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds } },
    });
    createdBookingIds.length = 0;
  }
}

async function createTestBookingWithSeat(uid: string, attendeeEmail: string, seatRefUid: string) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `booking-uid-${randomString()}`,
      title: "Seated Test Booking",
      startTime: new Date(`2025-06-19T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-19T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);

  const attendee = await prisma.attendee.create({
    data: {
      email: attendeeEmail,
      name: "Seated Attendee",
      timeZone: "America/New_York",
      locale: "en",
      phoneNumber: "+1234567890",
      bookingId: booking.id,
      noShow: false,
    },
  });

  await prisma.bookingSeat.create({
    data: {
      referenceUid: seatRefUid,
      bookingId: booking.id,
      attendeeId: attendee.id,
    },
  });

  return { booking, attendee };
}

describe("BookingSeatRepository (Integration Tests)", () => {
  let repo: BookingSeatRepository;

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
          title: "Seat Repo Test Event",
          slug: `seat-repo-test-${randomString()}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    repo = new BookingSeatRepository(prisma);
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

  describe("getByUidIncludeAttendee", () => {
    it("returns attendee email for a given seat uid", async () => {
      const seatRef = `seat-uid-${randomString()}-1`;
      await createTestBookingWithSeat("seat-1", "seated-attendee@test.com", seatRef);

      const result = await repo.getByUidIncludeAttendee(seatRef);

      expect(result).not.toBeNull();
      expect(result?.attendee?.email).toBe("seated-attendee@test.com");
    });

    it("returns null when seat uid not found", async () => {
      const result = await repo.getByUidIncludeAttendee("nonexistent-seat-uid");

      expect(result).toBeNull();
    });
  });

  describe("getByReferenceUidWithAttendeeDetails", () => {
    it("returns full attendee details for a given reference uid", async () => {
      const seatRef = `seat-details-${randomString()}-1`;
      const { attendee } = await createTestBookingWithSeat("details-1", "details@test.com", seatRef);

      const result = await repo.getByReferenceUidWithAttendeeDetails(seatRef);

      expect(result).not.toBeNull();
      expect(result?.attendee).toEqual(
        expect.objectContaining({
          id: attendee.id,
          name: "Seated Attendee",
          email: "details@test.com",
          timeZone: "America/New_York",
          locale: "en",
          phoneNumber: "+1234567890",
          noShow: false,
        })
      );
    });

    it("returns null when reference uid not found", async () => {
      const result = await repo.getByReferenceUidWithAttendeeDetails("nonexistent-ref-uid");

      expect(result).toBeNull();
    });

    it("returns attendee with null optional fields", async () => {
      const seatRef = `seat-nulls-${randomString()}-1`;
      const offset = bookingTimeOffset++;
      const booking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: "Null Fields Test",
          startTime: new Date(`2025-06-19T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
          endTime: new Date(`2025-06-19T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
          userId: testUserId,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
        },
      });
      createdBookingIds.push(booking.id);

      const attendee = await prisma.attendee.create({
        data: {
          email: "nullfields@test.com",
          name: "Null Fields",
          timeZone: "UTC",
          locale: null,
          phoneNumber: null,
          bookingId: booking.id,
          noShow: null,
        },
      });

      await prisma.bookingSeat.create({
        data: {
          referenceUid: seatRef,
          bookingId: booking.id,
          attendeeId: attendee.id,
        },
      });

      const result = await repo.getByReferenceUidWithAttendeeDetails(seatRef);

      expect(result?.attendee?.phoneNumber).toBeNull();
      expect(result?.attendee?.noShow).toBeNull();
      expect(result?.attendee?.locale).toBeNull();
    });
  });
});
