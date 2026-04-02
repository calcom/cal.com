import { prisma } from "@calcom/prisma";
import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

// ------------
// Test Helpers
// ------------

// Track resources to clean up
const createdBookingIds: number[] = [];
let testUserId: number;
let testEventTypeId: number | null = null;

async function clearTestBookings() {
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

async function createAttendeeNoShowTestBookings() {
  // Booking 1: 00:00-01:00
  const booking1 = await prisma.booking.create({
    data: {
      userId: testUserId,
      uid: "uid-1",
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
      attendees: {
        create: {
          email: "test1@example.com",
          noShow: false,
          name: "Test 1",
          timeZone: "America/Toronto",
        },
      },
      startTime: new Date("2025-05-01T00:00:00.000Z"),
      endTime: new Date("2025-05-01T01:00:00.000Z"),
      title: "Test Event",
    },
  });
  createdBookingIds.push(booking1.id);

  // Booking 2: 01:00-02:00 (different time to avoid idempotencyKey collision)
  const booking2 = await prisma.booking.create({
    data: {
      userId: testUserId,
      uid: "uid-2",
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
      attendees: {
        create: {
          email: "test1@example.com",
          noShow: true,
          name: "Test 1",
          timeZone: "America/Toronto",
        },
      },
      startTime: new Date("2025-05-01T01:00:00.000Z"),
      endTime: new Date("2025-05-01T02:00:00.000Z"),
      title: "Test Event",
    },
  });
  createdBookingIds.push(booking2.id);
}

async function createHostNoShowTestBookings() {
  // Booking 1: 02:00-03:00 (different time to avoid idempotencyKey collision)
  const booking1 = await prisma.booking.create({
    data: {
      userId: testUserId,
      uid: "uid-3",
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
      noShowHost: false,
      attendees: {
        create: {
          email: "att1@example.com",
          noShow: false,
          name: "Att 1",
          timeZone: "America/Toronto",
        },
      },
      startTime: new Date("2025-05-01T02:00:00.000Z"),
      endTime: new Date("2025-05-01T03:00:00.000Z"),
      title: "Test Event",
    },
  });
  createdBookingIds.push(booking1.id);

  // Booking 2: 03:00-04:00 (different time to avoid idempotencyKey collision)
  const booking2 = await prisma.booking.create({
    data: {
      userId: testUserId,
      uid: "uid-4",
      eventTypeId: testEventTypeId,
      status: BookingStatus.ACCEPTED,
      noShowHost: true,
      attendees: {
        create: {
          email: "att2@example.com",
          noShow: false,
          name: "Att 2",
          timeZone: "America/Toronto",
        },
      },
      startTime: new Date("2025-05-01T03:00:00.000Z"),
      endTime: new Date("2025-05-01T04:00:00.000Z"),
      title: "Test Event",
    },
  });
  createdBookingIds.push(booking2.id);
}

// -----------------
// Actual Test Suite
// -----------------

describe("BookingRepository (Integration Tests)", () => {
  beforeAll(async () => {
    // Use existing seed user
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    // Find or create a test event type for this user
    let eventType = await prisma.eventType.findFirst({
      where: { userId: testUserId },
    });

    if (!eventType) {
      eventType = await prisma.eventType.create({
        data: {
          title: "Test Event Type",
          slug: `test-event-type-${Date.now()}`,
          length: 30,
          userId: testUserId,
        },
      });
      testEventTypeId = eventType.id; // Track for cleanup
    } else {
      testEventTypeId = eventType.id; // Use existing, don't clean up
    }
  });

  afterAll(async () => {
    // Only delete event type if we created it
    if (testEventTypeId) {
      const eventType = await prisma.eventType.findUnique({
        where: { id: testEventTypeId },
        select: { slug: true },
      });
      if (eventType?.slug.startsWith("test-event-type-")) {
        await prisma.eventType.delete({
          where: { id: testEventTypeId },
        });
      }
    }
  });

  beforeEach(async () => {
    vi.setSystemTime(new Date("2025-05-01T00:00:00.000Z"));
  });

  afterEach(async () => {
    await clearTestBookings();
    vi.useRealTimers();
  });

  describe("getAllBookingsForRoundRobin", () => {
    describe("includeNoShowInRRCalculation", () => {
      it("should not include bookings where attendee is a no-show", async () => {
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(1);
      });

      it("should include attendee no-shows when enabled", async () => {
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(2);
      });

      it("should not include bookings where host is a no-show", async () => {
        await createHostNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(1);
      });

      it("should include host no-shows when enabled", async () => {
        await createHostNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(2);
      });

      it("should not include ANY host/attendee no-shows when disabled", async () => {
        await createHostNoShowTestBookings();
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(2);
      });

      it("should include ALL host/attendee no-shows when enabled", async () => {
        await createHostNoShowTestBookings();
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "organizer1@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(4);
      });
    });

    it("should filter by startTime when rrTimestampBasis=START_TIME", async () => {
      const mayBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "booking_may",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "test@example.com",
              noShow: false,
              name: "Test",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-26T00:00:00.000Z"),
          endTime: new Date("2025-05-26T01:00:00.000Z"),
          createdAt: new Date("2025-05-03T00:00:00.000Z"),
          title: "Test May",
        },
      });
      createdBookingIds.push(mayBooking.id);

      const juneBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "booking_june",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "test@example.com",
              noShow: true,
              name: "Test",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-06-26T00:00:00.000Z"),
          endTime: new Date("2025-06-26T01:00:00.000Z"),
          createdAt: new Date("2025-05-03T00:00:00.000Z"),
          title: "Test June",
        },
      });
      createdBookingIds.push(juneBooking.id);

      const bookingRepo = new BookingRepository(prisma);
      const bookings = await bookingRepo.getAllBookingsForRoundRobin({
        users: [{ id: testUserId, email: "org@example.com" }],
        eventTypeId: testEventTypeId,
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T23:59:59.999Z"),
        includeNoShowInRRCalculation: true,
        virtualQueuesData: null,
        rrTimestampBasis: RRTimestampBasis.START_TIME,
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].startTime.toISOString()).toBe("2025-06-26T00:00:00.000Z");
    });
  });
});
