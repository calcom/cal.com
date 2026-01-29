import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@calcom/prisma";

import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";
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
      expect(bookings[0].startTime.toISOString()).toBe(
        "2025-06-26T00:00:00.000Z"
      );
    });
  });

  describe("findAllExistingBookingsForEventTypeBetween", () => {
    it("should find bookings by userId", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "uid-user-booking",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-01T10:00:00.000Z"),
          endTime: new Date("2025-05-01T11:00:00.000Z"),
          title: "Test Booking",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();
      userIdAndEmailMap.set(testUserId, "organizer@example.com");

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-01T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      expect(bookings.length).toBeGreaterThanOrEqual(1);
      expect(bookings.some((b) => b.id === booking.id)).toBe(true);
    });

    it("should find bookings by attendee email", async () => {
      const otherUser = await prisma.user.findFirst({
        where: { email: { not: "member0-acme@example.com" } },
      });

      if (!otherUser) {
        console.log("Skipping test: no other user found");
        return;
      }

      const booking = await prisma.booking.create({
        data: {
          userId: otherUser.id,
          uid: "uid-attendee-booking",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "target-attendee@example.com",
              name: "Target Attendee",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "Attendee Email Test",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();
      userIdAndEmailMap.set(999999, "target-attendee@example.com");

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-01T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      expect(bookings.some((b) => b.id === booking.id)).toBe(true);
    });

    it("should find pending bookings with requiresConfirmation for event type", async () => {
      const eventTypeWithConfirmation = await prisma.eventType.create({
        data: {
          title: "Confirmation Required Event",
          slug: `confirmation-event-${Date.now()}`,
          length: 30,
          userId: testUserId,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "uid-pending-confirmation",
          eventTypeId: eventTypeWithConfirmation.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "pending@example.com",
              name: "Pending Attendee",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-01T16:00:00.000Z"),
          endTime: new Date("2025-05-01T17:00:00.000Z"),
          title: "Pending Confirmation Test",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();
      userIdAndEmailMap.set(999999, "nonexistent@example.com");

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        eventTypeId: eventTypeWithConfirmation.id,
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-01T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      expect(bookings.some((b) => b.id === booking.id)).toBe(true);

      await prisma.attendee.deleteMany({ where: { bookingId: booking.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
      await prisma.eventType.delete({ where: { id: eventTypeWithConfirmation.id } });
      createdBookingIds.splice(createdBookingIds.indexOf(booking.id), 1);
    });

    it("should exclude organizer from attendee results to prevent duplicates", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "uid-organizer-attendee",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "organizer-as-attendee@example.com",
              name: "Organizer",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-01T18:00:00.000Z"),
          endTime: new Date("2025-05-01T19:00:00.000Z"),
          title: "Organizer Attendee Test",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();
      userIdAndEmailMap.set(testUserId, "organizer-as-attendee@example.com");

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-01T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      const matchingBookings = bookings.filter((b) => b.id === booking.id);
      expect(matchingBookings.length).toBe(1);
    });

    it("should return empty array when no emails provided", async () => {
      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-01T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toEqual([]);
    });

    it("should filter bookings by date range", async () => {
      const bookingInRange = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "uid-in-range",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "range@example.com",
              name: "Range Test",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-05-15T10:00:00.000Z"),
          endTime: new Date("2025-05-15T11:00:00.000Z"),
          title: "In Range",
        },
      });
      createdBookingIds.push(bookingInRange.id);

      const bookingOutOfRange = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "uid-out-of-range",
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: "range@example.com",
              name: "Range Test",
              timeZone: "UTC",
            },
          },
          startTime: new Date("2025-06-15T10:00:00.000Z"),
          endTime: new Date("2025-06-15T11:00:00.000Z"),
          title: "Out of Range",
        },
      });
      createdBookingIds.push(bookingOutOfRange.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map<number, string>();
      userIdAndEmailMap.set(testUserId, "organizer@example.com");

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T00:00:00.000Z"),
        endDate: new Date("2025-05-31T23:59:59.999Z"),
        userIdAndEmailMap,
      });

      expect(bookings.some((b) => b.id === bookingInRange.id)).toBe(true);
      expect(bookings.some((b) => b.id === bookingOutOfRange.id)).toBe(false);
    });
  });
});
