import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { prisma } from "@calcom/prisma";

import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";
import { BookingRepository } from "./BookingRepository";

// ------------
// Test Helpers
// ------------

// Track resources to clean up
const createdBookingIds: number[] = [];
const createdEventTypeIds: number[] = [];
let testUserId: number;
let testUser2Id: number;
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

  if (createdEventTypeIds.length > 0) {
    await prisma.eventType.deleteMany({
      where: { id: { in: createdEventTypeIds } },
    });
    createdEventTypeIds.length = 0;
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
});

describe("_findAllExistingBookingsForEventTypeBetween", () => {
  beforeAll(async () => {
    const testUser = await prisma.user.findFirstOrThrow({
      where: { email: "member0-acme@example.com" },
    });
    testUserId = testUser.id;

    const testUser2 = await prisma.user.findFirstOrThrow({
      where: { email: { not: "member0-acme@example.com" } },
    });
    testUser2Id = testUser2.id;
  });

  beforeEach(() => {
    vi.setSystemTime(new Date("2025-05-01T12:00:00.000Z"));
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await clearTestBookings();
    vi.useRealTimers();
  });

  describe("Cross-event-type PENDING bookings with requiresConfirmationWillBlockSlot", () => {
    it("PENDING booking with block slot enabled should block slots globally for all event types", async () => {
      // Create Event Type A
      const eventTypeA = await prisma.eventType.create({
        data: {
          title: "Event Type A",
          slug: `event-type-a-${Date.now()}`,
          description: "Event Type A with slot blocking",
          userId: testUserId,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });
      createdEventTypeIds.push(eventTypeA.id);

      // Create Event Type B
      const eventTypeB = await prisma.eventType.create({
        data: {
          title: "Event Type B",
          slug: `event-type-b-${Date.now()}`,
          description: "Event Type B",
          userId: testUserId,
          length: 60,
          requiresConfirmation: false,
          requiresConfirmationWillBlockSlot: false,
        },
      });
      createdEventTypeIds.push(eventTypeB.id);

      // create a PENDING booking for Event Type A
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "pending-booking-type-a",
          eventTypeId: eventTypeA.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "test1@example.com",
              noShow: false,
              name: "Test 1",
              timeZone: "America/Toronto",
            },
          },
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "PENDING Event Type A Booking",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map([[testUserId, "test1@example.com"]]);

      // finding PENDING bookings that has blocked slots globally for all event types
      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(1);
    });

    it("should NOT include PENDING bookings that don't block slots", async () => {
      const eventType = await prisma.eventType.create({
        data: {
          title: "Non-blocking Event Type",
          slug: `non-blocking-event-type-${Date.now()}`,
          description: "This event type doesn't block slots",
          userId: testUserId,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: false,
        },
      });
      createdEventTypeIds.push(eventType.id);

      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "pending-non-blocking",
          eventTypeId: eventType.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "test1@example.com",
              noShow: false,
              name: "Test 1",
              timeZone: "America/Toronto",
            },
          },
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "PENDING Non-blocking Event",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map([[testUserId, "test1@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(0);
    });

    it("should remove duplicate PENDING bookings when organizer books their own event type", async () => {
      // Create event type with slot blocking
      const eventType = await prisma.eventType.create({
        data: {
          title: "Self-Booking Event Type",
          slug: `self-booking-event-type-${Date.now()}`,
          description: "Event type for self-booking scenario",
          userId: testUserId,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });
      createdEventTypeIds.push(eventType.id);

      // Create a PENDING booking where organizer is also an attendee
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "pending-self-booking",
          eventTypeId: eventType.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "organizer@example.com",
              noShow: false,
              name: "Organizer",
              timeZone: "America/Toronto",
            },
          },
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "PENDING Self-Booking",
        },
      });
      createdBookingIds.push(booking.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map([[testUserId, "organizer@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      // Should return only 1 booking, not 2
      // The booking appears in both pendingAndBlockingBookingsWhereUserIsOrganizer
      // and pendingAndBlockingBookingsWhereUserIsAttendee queries
      expect(bookings).toHaveLength(1);
      expect(bookings[0].uid).toBe("pending-self-booking");
      expect(bookings[0].status).toBe(BookingStatus.PENDING);
    });

    it("should include separate PENDING bookings when organizer and attendee are different people", async () => {
      // Create event type with slot blocking
      const eventType = await prisma.eventType.create({
        data: {
          title: "Multi-User Event Type",
          slug: `multi-user-event-type-${Date.now()}`,
          description: "Event type for multi-user scenario",
          userId: testUserId,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });
      createdEventTypeIds.push(eventType.id);

      // Create a PENDING booking where organizer hosts for a different attendee
      const booking1 = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: "pending-organizer-booking",
          eventTypeId: eventType.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "attendee@example.com",
              noShow: false,
              name: "Attendee",
              timeZone: "America/Toronto",
            },
          },
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "PENDING Organizer Booking",
        },
      });
      createdBookingIds.push(booking1.id);

      // Create another PENDING booking where organizer is an attendee on someone else's event
      const booking2 = await prisma.booking.create({
        data: {
          userId: testUser2Id,
          uid: "pending-attendee-booking",
          eventTypeId: eventType.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: "organizer@example.com",
              noShow: false,
              name: "Organizer as Attendee",
              timeZone: "America/Toronto",
            },
          },
          startTime: new Date("2025-05-01T16:00:00.000Z"),
          endTime: new Date("2025-05-01T17:00:00.000Z"),
          title: "PENDING Attendee Booking",
        },
      });
      createdBookingIds.push(booking2.id);

      const bookingRepo = new BookingRepository(prisma);
      const userIdAndEmailMap = new Map([[testUserId, "organizer@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T18:00:00.000Z"),
        userIdAndEmailMap,
      });

      // Should return both bookings with no duplicates
      expect(bookings).toHaveLength(2);
      expect(bookings.map((b) => b.uid)).toContain("pending-organizer-booking");
      expect(bookings.map((b) => b.uid)).toContain("pending-attendee-booking");
    });
  });
});
