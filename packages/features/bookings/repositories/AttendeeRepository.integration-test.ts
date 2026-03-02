import { randomString } from "@calcom/lib/random";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AttendeeRepository } from "./AttendeeRepository";

let testUserId: number;
let testEventTypeId: number | null = null;
let createdEventType = false;
const createdBookingIds: number[] = [];
const createdAttendeeIds: number[] = [];
let bookingTimeOffset = 0;

async function cleanup() {
  if (createdAttendeeIds.length > 0) {
    await prisma.attendee.deleteMany({
      where: { id: { in: createdAttendeeIds } },
    });
    createdAttendeeIds.length = 0;
  }
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

async function createTestBooking(uid: string) {
  const offset = bookingTimeOffset++;
  const booking = await prisma.booking.create({
    data: {
      uid: `booking-uid-${randomString()}`,
      title: "Test Booking",
      startTime: new Date(`2025-06-17T${String(10 + offset).padStart(2, "0")}:00:00.000Z`),
      endTime: new Date(`2025-06-17T${String(11 + offset).padStart(2, "0")}:00:00.000Z`),
      userId: testUserId,
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
    },
  });
  createdBookingIds.push(booking.id);
  return booking;
}

async function createTestAttendee(bookingId: number, email: string, name: string, noShow?: boolean) {
  const attendee = await prisma.attendee.create({
    data: {
      email,
      name,
      timeZone: "UTC",
      locale: "en",
      bookingId,
      noShow: noShow ?? false,
    },
  });
  createdAttendeeIds.push(attendee.id);
  return attendee;
}

describe("AttendeeRepository (Integration Tests)", () => {
  let repo: AttendeeRepository;

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
          title: "Attendee Repo Test Event",
          slug: `attendee-repo-test-${randomString()}`,
          length: 30,
          userId: testUserId,
        },
      });
      createdEventType = true;
    }
    testEventTypeId = eventType.id;

    repo = new AttendeeRepository(prisma);
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

  describe("findById", () => {
    it("returns attendee name and email when found", async () => {
      const booking = await createTestBooking("findById-1");
      const attendee = await createTestAttendee(booking.id, "findbyid@test.com", "Find Me");

      const result = await repo.findById(attendee.id);

      expect(result).toEqual({
        name: "Find Me",
        email: "findbyid@test.com",
      });
    });

    it("returns null when attendee not found", async () => {
      const result = await repo.findById(999999);

      expect(result).toBeNull();
    });
  });

  describe("findByIds", () => {
    it("returns matching attendees with id, name, and email", async () => {
      const booking = await createTestBooking("findByIds-1");
      const att1 = await createTestAttendee(booking.id, "att1@test.com", "Attendee One");
      const att2 = await createTestAttendee(booking.id, "att2@test.com", "Attendee Two");

      const result = await repo.findByIds({ ids: [att1.id, att2.id] });

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: att1.id, name: "Attendee One", email: "att1@test.com" }),
          expect.objectContaining({ id: att2.id, name: "Attendee Two", email: "att2@test.com" }),
        ])
      );
    });

    it("returns empty array when no matching ids", async () => {
      const result = await repo.findByIds({ ids: [999999] });

      expect(result).toEqual([]);
    });
  });

  describe("findByBookingIdAndSeatReference", () => {
    it("queries by bookingId and seat referenceUid", async () => {
      const booking = await createTestBooking("seat-ref-1");
      const attendee = await createTestAttendee(booking.id, "seated@test.com", "Seated Attendee");

      const seatRef = `seat-ref-${randomString()}`;
      await prisma.bookingSeat.create({
        data: {
          referenceUid: seatRef,
          bookingId: booking.id,
          attendeeId: attendee.id,
        },
      });

      const result = await repo.findByBookingIdAndSeatReference({
        bookingId: booking.id,
        seatReferenceUid: seatRef,
      });

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("seated@test.com");
    });

    it("returns empty when no matching seat reference", async () => {
      const booking = await createTestBooking("seat-ref-2");
      await createTestAttendee(booking.id, "noseated@test.com", "No Seat");

      const result = await repo.findByBookingIdAndSeatReference({
        bookingId: booking.id,
        seatReferenceUid: "nonexistent-seat-ref",
      });

      expect(result).toEqual([]);
    });
  });

  describe("findByBookingUidAndEmails", () => {
    it("queries by booking uid and email list", async () => {
      const booking = await createTestBooking("uid-emails-1");
      await createTestAttendee(booking.id, "a@test.com", "A");
      await createTestAttendee(booking.id, "b@test.com", "B");
      await createTestAttendee(booking.id, "c@test.com", "C");

      const result = await repo.findByBookingUidAndEmails({
        bookingUid: booking.uid,
        emails: ["a@test.com", "b@test.com"],
      });

      expect(result).toHaveLength(2);
      const emails = result.map((r) => r.email);
      expect(emails).toContain("a@test.com");
      expect(emails).toContain("b@test.com");
    });

    it("returns empty array when no matching emails", async () => {
      const booking = await createTestBooking("uid-emails-2");
      await createTestAttendee(booking.id, "exists@test.com", "Exists");

      const result = await repo.findByBookingUidAndEmails({
        bookingUid: booking.uid,
        emails: ["nonexistent@test.com"],
      });

      expect(result).toEqual([]);
    });
  });

  describe("updateNoShow", () => {
    it("updates noShow flag and returns result", async () => {
      const booking = await createTestBooking("noshow-1");
      const attendee = await createTestAttendee(booking.id, "noshow@test.com", "No Show");

      const result = await repo.updateNoShow({
        where: { attendeeId: attendee.id },
        data: { noShow: true },
      });

      expect(result.noShow).toBe(true);
      expect(result.email).toBe("noshow@test.com");

      // Verify in database
      const dbAttendee = await prisma.attendee.findUnique({ where: { id: attendee.id } });
      expect(dbAttendee?.noShow).toBe(true);
    });
  });

  describe("findByBookingId", () => {
    it("returns all attendees for a booking with safe select fields", async () => {
      const booking = await createTestBooking("by-booking-id-1");
      await createTestAttendee(booking.id, "first@test.com", "First Attendee");
      await createTestAttendee(booking.id, "second@test.com", "Second Attendee");

      const result = await repo.findByBookingId(booking.id);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("locale");
      expect(result[0]).toHaveProperty("timeZone");
      expect(result[0]).toHaveProperty("phoneNumber");
      expect(result[0]).toHaveProperty("bookingId");
      expect(result[0]).toHaveProperty("noShow");
    });

    it("returns empty array when booking has no attendees", async () => {
      const booking = await createTestBooking("by-booking-id-2");

      const result = await repo.findByBookingId(booking.id);

      expect(result).toEqual([]);
    });
  });

  describe("updateManyNoShowByBookingIdAndEmails", () => {
    it("updates noShow for matching attendees and returns count", async () => {
      const booking = await createTestBooking("batch-noshow-1");
      await createTestAttendee(booking.id, "batch-a@test.com", "A");
      await createTestAttendee(booking.id, "batch-b@test.com", "B");
      await createTestAttendee(booking.id, "batch-c@test.com", "C");

      const result = await repo.updateManyNoShowByBookingIdAndEmails({
        where: { bookingId: booking.id, emails: ["batch-a@test.com", "batch-b@test.com"] },
        data: { noShow: true },
      });

      expect(result.count).toBe(2);

      // Verify in database
      const attendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        orderBy: { email: "asc" },
      });
      expect(attendees.find((a) => a.email === "batch-a@test.com")?.noShow).toBe(true);
      expect(attendees.find((a) => a.email === "batch-b@test.com")?.noShow).toBe(true);
      expect(attendees.find((a) => a.email === "batch-c@test.com")?.noShow).toBe(false);
    });
  });

  describe("updateManyNoShowByBookingIdExcludingEmails", () => {
    it("updates noShow for attendees NOT in exclude list", async () => {
      const booking = await createTestBooking("exclude-noshow-1");
      await createTestAttendee(booking.id, "host@test.com", "Host");
      await createTestAttendee(booking.id, "guest1@test.com", "Guest 1");
      await createTestAttendee(booking.id, "guest2@test.com", "Guest 2");

      const result = await repo.updateManyNoShowByBookingIdExcludingEmails({
        where: { bookingId: booking.id, excludeEmails: ["host@test.com"] },
        data: { noShow: true },
      });

      expect(result.count).toBe(2);

      // Verify in database
      const attendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        orderBy: { email: "asc" },
      });
      expect(attendees.find((a) => a.email === "host@test.com")?.noShow).toBe(false);
      expect(attendees.find((a) => a.email === "guest1@test.com")?.noShow).toBe(true);
      expect(attendees.find((a) => a.email === "guest2@test.com")?.noShow).toBe(true);
    });
  });
});
