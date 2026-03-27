import { prisma } from "@calcom/prisma";
import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingRepository } from "./BookingRepository";

// ------------
// Test Helpers
// ------------

// Track resources to clean up
const createdBookingIds: number[] = [];
const createdEventTypeIds: number[] = [];
let testUserId: number;
let otherUserId: number;
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
  // Booking 1: attendee noShow=false (should be included when filtering)
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

  // Booking 2: attendee noShow=true (should be excluded when filtering)
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

  return { nonNoShow: booking1, noShow: booking2 };
}

async function createHostNoShowTestBookings() {
  // Booking 1: noShowHost=false (should be included when filtering)
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

  // Booking 2: noShowHost=true (should be excluded when filtering)
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

  return { nonNoShow: booking1, noShow: booking2 };
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

    // Find a second seed user to act as a different organizer
    const otherUser = await prisma.user.findFirstOrThrow({
      where: { email: { not: "member0-acme@example.com" } },
    });
    otherUserId = otherUser.id;

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
        const { nonNoShow, noShow } = await createAttendeeNoShowTestBookings();

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
        expect(bookings[0].id).toBe(nonNoShow.id);
        // Verify the no-show booking is NOT in the results
        expect(bookings.some((b) => b.id === noShow.id)).toBe(false);
      });

      it("should include attendee no-shows when enabled", async () => {
        const { nonNoShow, noShow } = await createAttendeeNoShowTestBookings();

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
        const ids = bookings.map((b) => b.id);
        expect(ids).toContain(nonNoShow.id);
        expect(ids).toContain(noShow.id);
      });

      it("should not include bookings where host is a no-show", async () => {
        const { nonNoShow, noShow } = await createHostNoShowTestBookings();

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
        expect(bookings[0].id).toBe(nonNoShow.id);
        expect(bookings.some((b) => b.id === noShow.id)).toBe(false);
      });

      it("should include host no-shows when enabled", async () => {
        const { nonNoShow, noShow } = await createHostNoShowTestBookings();

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
        const ids = bookings.map((b) => b.id);
        expect(ids).toContain(nonNoShow.id);
        expect(ids).toContain(noShow.id);
      });

      it("should not include ANY host/attendee no-shows when disabled", async () => {
        const host = await createHostNoShowTestBookings();
        const attendee = await createAttendeeNoShowTestBookings();

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
        const ids = bookings.map((b) => b.id);
        expect(ids).toContain(host.nonNoShow.id);
        expect(ids).toContain(attendee.nonNoShow.id);
        // No-show bookings must NOT be present
        expect(ids).not.toContain(host.noShow.id);
        expect(ids).not.toContain(attendee.noShow.id);
      });

      it("should include ALL host/attendee no-shows when enabled", async () => {
        const host = await createHostNoShowTestBookings();
        const attendee = await createAttendeeNoShowTestBookings();

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
        const ids = bookings.map((b) => b.id);
        expect(ids).toContain(host.nonNoShow.id);
        expect(ids).toContain(host.noShow.id);
        expect(ids).toContain(attendee.nonNoShow.id);
        expect(ids).toContain(attendee.noShow.id);
      });
    });

    describe("attendee email matching", () => {
      it("should include bookings where user is an attendee but not the organizer", async () => {
        // Create a booking where testUser is NOT the organizer but IS an attendee
        const booking = await prisma.booking.create({
          data: {
            userId: otherUserId, // different organizer
            uid: "uid-attendee-match",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "member0-acme@example.com", // testUser's email
                noShow: false,
                name: "Test Attendee",
                timeZone: "UTC",
              },
            },
            startTime: new Date("2025-05-01T05:00:00.000Z"),
            endTime: new Date("2025-05-01T06:00:00.000Z"),
            title: "Attendee Match Test",
          },
        });
        createdBookingIds.push(booking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "member0-acme@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(booking.id);
      });

      it("should deduplicate bookings where user is both organizer and attendee", async () => {
        // Create a booking where testUser is both the organizer AND an attendee
        const booking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-dedup-test",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "member0-acme@example.com", // testUser's email
                noShow: false,
                name: "Test Dedup",
                timeZone: "UTC",
              },
            },
            startTime: new Date("2025-05-01T07:00:00.000Z"),
            endTime: new Date("2025-05-01T08:00:00.000Z"),
            title: "Dedup Test",
          },
        });
        createdBookingIds.push(booking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "member0-acme@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // Should appear only once, not duplicated
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(booking.id);
      });

      it("should exclude attendee-matched bookings when attendee is a no-show", async () => {
        // Create a booking where testUser is an attendee with noShow: true
        const booking = await prisma.booking.create({
          data: {
            userId: otherUserId, // different organizer
            uid: "uid-attendee-noshow",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "member0-acme@example.com", // testUser's email
                noShow: true,
                name: "No Show Attendee",
                timeZone: "UTC",
              },
            },
            startTime: new Date("2025-05-01T09:00:00.000Z"),
            endTime: new Date("2025-05-01T10:00:00.000Z"),
            title: "Attendee NoShow Test",
          },
        });
        createdBookingIds.push(booking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "member0-acme@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // Should be excluded because attendee is a no-show
        expect(bookings).toHaveLength(0);
      });
    });

    describe("CREATED_AT timestamp basis", () => {
      it("should filter by createdAt when rrTimestampBasis=CREATED_AT", async () => {
        // Booking created in May, starts in June
        const mayCreatedBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-created-may",
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
            createdAt: new Date("2025-05-15T00:00:00.000Z"),
            startTime: new Date("2025-06-01T00:00:00.000Z"),
            endTime: new Date("2025-06-01T01:00:00.000Z"),
            title: "Created in May",
          },
        });
        createdBookingIds.push(mayCreatedBooking.id);

        // Booking created in June, starts in May
        const juneCreatedBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-created-june",
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
            createdAt: new Date("2025-06-10T00:00:00.000Z"),
            startTime: new Date("2025-05-20T00:00:00.000Z"),
            endTime: new Date("2025-05-20T01:00:00.000Z"),
            title: "Created in June",
          },
        });
        createdBookingIds.push(juneCreatedBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-06-01T00:00:00.000Z"),
          endDate: new Date("2025-06-30T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.CREATED_AT,
        });

        // Only the June-created booking should match (createdAt in June range)
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(juneCreatedBooking.id);
      });
    });

    describe("PENDING bookings excluded", () => {
      it("should not include PENDING bookings in RR calculations", async () => {
        const acceptedBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-accepted",
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
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "Accepted Booking",
          },
        });
        createdBookingIds.push(acceptedBooking.id);

        const pendingBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-pending",
            eventTypeId: testEventTypeId,
            status: BookingStatus.PENDING,
            attendees: {
              create: {
                email: "test@example.com",
                noShow: false,
                name: "Test",
                timeZone: "UTC",
              },
            },
            startTime: new Date("2025-05-01T02:00:00.000Z"),
            endTime: new Date("2025-05-01T03:00:00.000Z"),
            title: "Pending Booking",
          },
        });
        createdBookingIds.push(pendingBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // Only the ACCEPTED booking should be returned
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(acceptedBooking.id);
      });
    });

    describe("multiple users and ordering", () => {
      it("should return bookings for multiple users from both branches and sort by createdAt desc", async () => {
        // testUser is the organizer of booking1 (oldest)
        const booking1 = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-multi-1",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "external@example.com",
                noShow: false,
                name: "External",
                timeZone: "UTC",
              },
            },
            createdAt: new Date("2025-05-01T00:00:00.000Z"),
            startTime: new Date("2025-05-10T00:00:00.000Z"),
            endTime: new Date("2025-05-10T01:00:00.000Z"),
            title: "Booking 1 by testUser",
          },
        });
        createdBookingIds.push(booking1.id);

        // otherUser is the organizer, but testUser is an attendee (middle)
        const booking2 = await prisma.booking.create({
          data: {
            userId: otherUserId,
            uid: "uid-multi-2",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "member0-acme@example.com", // testUser's email
                noShow: false,
                name: "Test User as Attendee",
                timeZone: "UTC",
              },
            },
            createdAt: new Date("2025-05-02T00:00:00.000Z"),
            startTime: new Date("2025-05-11T00:00:00.000Z"),
            endTime: new Date("2025-05-11T01:00:00.000Z"),
            title: "Booking 2 with testUser as attendee",
          },
        });
        createdBookingIds.push(booking2.id);

        // otherUser is the organizer of booking3 (newest)
        const booking3 = await prisma.booking.create({
          data: {
            userId: otherUserId,
            uid: "uid-multi-3",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "someone@example.com",
                noShow: false,
                name: "Someone",
                timeZone: "UTC",
              },
            },
            createdAt: new Date("2025-05-03T00:00:00.000Z"),
            startTime: new Date("2025-05-12T00:00:00.000Z"),
            endTime: new Date("2025-05-12T01:00:00.000Z"),
            title: "Booking 3 by otherUser",
          },
        });
        createdBookingIds.push(booking3.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [
            { id: testUserId, email: "member0-acme@example.com" },
            { id: otherUserId, email: "other@example.com" },
          ],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-31T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // All 3 bookings should be returned (booking1 via userId, booking2 via attendee email + userId, booking3 via userId)
        expect(bookings).toHaveLength(3);

        // Verify ordering: most recent createdAt first
        expect(bookings[0].id).toBe(booking3.id);
        expect(bookings[1].id).toBe(booking2.id);
        expect(bookings[2].id).toBe(booking1.id);
      });

      it("should return bookings without date range when startDate and endDate are omitted", async () => {
        const booking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-no-range",
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
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "No Range Test",
          },
        });
        createdBookingIds.push(booking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          // No startDate or endDate
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // Without date filtering, all ACCEPTED bookings for this eventType are returned.
        // We verify our booking is included (other seed data bookings may also appear).
        expect(bookings.length).toBeGreaterThanOrEqual(1);
        expect(bookings.some((b) => b.id === booking.id)).toBe(true);
      });
    });

    describe("noShowHost on attendee email branch", () => {
      it("should exclude attendee-email-matched bookings where host is a no-show when noShow filtering is enabled", async () => {
        // Previously the noShowHost filter only applied to the userId branch
        // in SQL, not the attendee email branch. Now that noShow filtering is
        // done in application code (for performance — eliminates O(n) EXISTS
        // semi-join probes), noShowHost is applied uniformly to all bookings
        // regardless of which UNION branch produced them. This is slightly
        // stricter but more consistent: if the host no-showed, the booking
        // shouldn't count toward anyone's round-robin balance.
        const booking = await prisma.booking.create({
          data: {
            userId: otherUserId, // different organizer (host)
            uid: "uid-host-noshow-attendee",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            noShowHost: true, // host was a no-show
            attendees: {
              create: {
                email: "member0-acme@example.com", // testUser's email
                noShow: false,
                name: "Test Attendee",
                timeZone: "UTC",
              },
            },
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "Host NoShow Attendee Branch",
          },
        });
        createdBookingIds.push(booking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "member0-acme@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // The booking is excluded because noShowHost filtering now applies
        // uniformly to all bookings (moved from SQL to application layer)
        expect(bookings).toHaveLength(0);
      });
    });

    describe("eventTypeId isolation", () => {
      it("should not return bookings from a different eventTypeId", async () => {
        // Create a second event type
        vi.useRealTimers();
        const otherEventType = await prisma.eventType.create({
          data: {
            title: "Other Event Type",
            slug: `test-other-event-type-${Date.now()}`,
            length: 30,
            userId: testUserId,
          },
        });
        createdEventTypeIds.push(otherEventType.id);

        // Create booking on our test eventType
        const matchingBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-evt-match",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "Matching EventType",
          },
        });
        createdBookingIds.push(matchingBooking.id);

        // Create booking on the OTHER eventType (should not appear)
        const otherBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-evt-other",
            eventTypeId: otherEventType.id,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T02:00:00.000Z"),
            endTime: new Date("2025-05-01T03:00:00.000Z"),
            title: "Other EventType",
          },
        });
        createdBookingIds.push(otherBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(matchingBooking.id);
        expect(bookings.some((b) => b.id === otherBooking.id)).toBe(false);
      });
    });

    describe("CANCELLED and REJECTED status exclusion", () => {
      it("should not include CANCELLED or REJECTED bookings", async () => {
        const acceptedBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-status-accepted",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "Accepted",
          },
        });
        createdBookingIds.push(acceptedBooking.id);

        const cancelledBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-status-cancelled",
            eventTypeId: testEventTypeId,
            status: BookingStatus.CANCELLED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T02:00:00.000Z"),
            endTime: new Date("2025-05-01T03:00:00.000Z"),
            title: "Cancelled",
          },
        });
        createdBookingIds.push(cancelledBooking.id);

        const rejectedBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-status-rejected",
            eventTypeId: testEventTypeId,
            status: BookingStatus.REJECTED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T04:00:00.000Z"),
            endTime: new Date("2025-05-01T05:00:00.000Z"),
            title: "Rejected",
          },
        });
        createdBookingIds.push(rejectedBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(acceptedBooking.id);
        expect(bookings.some((b) => b.id === cancelledBooking.id)).toBe(false);
        expect(bookings.some((b) => b.id === rejectedBooking.id)).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should exclude a booking with zero attendees when noShow filtering is enabled", async () => {
        // A booking with NO attendees: EXISTS (SELECT 1 FROM Attendee WHERE noShow=false) → false
        // So it should be excluded when includeNoShowInRRCalculation=false
        const noAttendeeBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-no-attendees",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            // No attendees created
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "No Attendees",
          },
        });
        createdBookingIds.push(noAttendeeBooking.id);

        // Also create a normal booking with an attendee for comparison
        const normalBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-with-attendees",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: { email: "test@example.com", noShow: false, name: "Test", timeZone: "UTC" },
            },
            startTime: new Date("2025-05-01T02:00:00.000Z"),
            endTime: new Date("2025-05-01T03:00:00.000Z"),
            title: "With Attendees",
          },
        });
        createdBookingIds.push(normalBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // The booking with no attendees should be excluded (no attendee with noShow=false exists)
        expect(bookings).toHaveLength(1);
        expect(bookings[0].id).toBe(normalBooking.id);
        expect(bookings.some((b) => b.id === noAttendeeBooking.id)).toBe(false);
      });

      it("should include a booking with zero attendees when noShow filtering is disabled", async () => {
        const noAttendeeBooking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: "uid-no-attendees-incl",
            eventTypeId: testEventTypeId,
            status: BookingStatus.ACCEPTED,
            startTime: new Date("2025-05-01T00:00:00.000Z"),
            endTime: new Date("2025-05-01T01:00:00.000Z"),
            title: "No Attendees Included",
          },
        });
        createdBookingIds.push(noAttendeeBooking.id);

        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: testUserId, email: "org@example.com" }],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true, // noShow filtering disabled
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        // With noShow filtering disabled, the booking should be included
        expect(bookings.some((b) => b.id === noAttendeeBooking.id)).toBe(true);
      });

      it("should return empty array when users list is empty", async () => {
        const bookingRepo = new BookingRepository(prisma);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [],
          eventTypeId: testEventTypeId,
          startDate: new Date("2025-05-01T00:00:00.000Z"),
          endDate: new Date("2025-05-01T23:59:59.999Z"),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
          rrTimestampBasis: RRTimestampBasis.START_TIME,
        });

        expect(bookings).toHaveLength(0);
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

  describe("findLatestBookingInRescheduleChain", () => {
    const bookingRepo = new BookingRepository(prisma);
    const chainUidPrefix = `chain-test-${Date.now()}`;

    async function createRescheduleChain(length: number) {
      const bookings = [];
      for (let i = 0; i < length; i++) {
        const booking = await prisma.booking.create({
          data: {
            userId: testUserId,
            uid: `${chainUidPrefix}-${i}`,
            eventTypeId: testEventTypeId,
            status: i < length - 1 ? BookingStatus.CANCELLED : BookingStatus.ACCEPTED,
            rescheduled: i < length - 1,
            fromReschedule: i > 0 ? `${chainUidPrefix}-${i - 1}` : null,
            startTime: new Date(`2025-06-01T${String(i).padStart(2, "0")}:00:00.000Z`),
            endTime: new Date(`2025-06-01T${String(i).padStart(2, "0")}:30:00.000Z`),
            title: `Chain Booking ${i}`,
          },
        });
        createdBookingIds.push(booking.id);
        bookings.push(booking);
      }
      return bookings;
    }

    it("should return null when booking has no reschedule chain", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${chainUidPrefix}-solo`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          startTime: new Date("2025-06-01T10:00:00.000Z"),
          endTime: new Date("2025-06-01T10:30:00.000Z"),
          title: "Solo Booking",
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-solo`,
      });

      expect(result).toBeNull();
    });

    it("should resolve a chain of 2 bookings (A → B)", async () => {
      await createRescheduleChain(2);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-0`,
      });

      expect(result).not.toBeNull();
      expect(result!.uid).toBe(`${chainUidPrefix}-1`);
    });

    it("should resolve a chain of 5 bookings (A → B → C → D → E)", async () => {
      await createRescheduleChain(5);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-0`,
      });

      expect(result).not.toBeNull();
      expect(result!.uid).toBe(`${chainUidPrefix}-4`);
    });

    it("should resolve from a mid-chain booking", async () => {
      await createRescheduleChain(4);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-1`,
      });

      expect(result).not.toBeNull();
      expect(result!.uid).toBe(`${chainUidPrefix}-3`);
    });

    it("should return null when called with the last booking in the chain", async () => {
      await createRescheduleChain(3);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-2`,
      });

      expect(result).toBeNull();
    });

    it("should include eventType in the result", async () => {
      await createRescheduleChain(2);

      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: `${chainUidPrefix}-0`,
      });

      expect(result).not.toBeNull();
      expect(result!.eventType).toBeDefined();
      expect(result!.eventType!.id).toBe(testEventTypeId);
    });

    it("should return null for non-existent booking uid", async () => {
      const result = await bookingRepo.findLatestBookingInRescheduleChain({
        bookingUid: "non-existent-uid",
      });

      expect(result).toBeNull();
    });
  });

  describe("findOriginalRescheduledBooking", () => {
    const bookingRepo = new BookingRepository(prisma);
    const uidPrefix = `reschedule-test-${Date.now()}`;

    // Track extra resources for cleanup in this describe block
    const createdWorkflowReminderIds: number[] = [];

    afterEach(async () => {
      // WorkflowReminder is linked via bookingUid (not cascading), so delete manually
      if (createdWorkflowReminderIds.length > 0) {
        await prisma.workflowReminder.deleteMany({
          where: { id: { in: createdWorkflowReminderIds } },
        });
        createdWorkflowReminderIds.length = 0;
      }
    });

    it("should return null when no booking matches the uid", async () => {
      const result = await bookingRepo.findOriginalRescheduledBooking("non-existent-uid-xyz");

      expect(result).toBeNull();
    });

    it("should return booking with all expected scalar fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-scalars`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Reschedule Scalar Test",
          description: "A test description",
          location: "https://meet.example.com/test",
          startTime: new Date("2025-07-01T10:00:00.000Z"),
          endTime: new Date("2025-07-01T10:30:00.000Z"),
          paid: false,
          iCalSequence: 1,
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Test Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-scalars`);

      expect(result).not.toBeNull();
      // Verify all expected scalar fields are present
      expect(result!.id).toBe(booking.id);
      expect(result!.uid).toBe(`${uidPrefix}-scalars`);
      expect(result!.title).toBe("Reschedule Scalar Test");
      expect(result!.description).toBe("A test description");
      expect(result!.location).toBe("https://meet.example.com/test");
      expect(result!.startTime).toEqual(new Date("2025-07-01T10:00:00.000Z"));
      expect(result!.endTime).toEqual(new Date("2025-07-01T10:30:00.000Z"));
      expect(result!.status).toBe(BookingStatus.ACCEPTED);
      expect(result!.paid).toBe(false);
      expect(result!.iCalSequence).toBe(1);
      expect(result!.userId).toBe(testUserId);
      expect(result).toHaveProperty("responses");
      expect(result).toHaveProperty("metadata");
      expect(result).toHaveProperty("recurringEventId");
      expect(result).toHaveProperty("iCalUID");
      expect(result).toHaveProperty("rescheduled");
    });

    it("should return scoped attendee fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-attendees`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Attendee Test",
          startTime: new Date("2025-07-01T11:00:00.000Z"),
          endTime: new Date("2025-07-01T11:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee Name",
              timeZone: "America/New_York",
              locale: "en",
              phoneNumber: "+1234567890",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-attendees`);

      expect(result).not.toBeNull();
      expect(result!.attendees).toHaveLength(1);
      const attendee = result!.attendees[0];
      expect(attendee.name).toBe("Attendee Name");
      expect(attendee.email).toBe("att@example.com");
      expect(attendee.timeZone).toBe("America/New_York");
      expect(attendee.locale).toBe("en");
      expect(attendee.phoneNumber).toBe("+1234567890");
    });

    it("should return scoped user fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-user`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "User Test",
          startTime: new Date("2025-07-01T12:00:00.000Z"),
          endTime: new Date("2025-07-01T12:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-user`);

      expect(result).not.toBeNull();
      expect(result!.user).not.toBeNull();
      expect(result!.user!.id).toBe(testUserId);
      expect(result!.user).toHaveProperty("name");
      expect(result!.user).toHaveProperty("username");
      expect(result!.user).toHaveProperty("email");
      expect(result!.user).toHaveProperty("locale");
      expect(result!.user).toHaveProperty("timeZone");
      expect(result!.user).toHaveProperty("timeFormat");
      expect(result!.user).toHaveProperty("destinationCalendar");
      expect(result!.user).toHaveProperty("credentials");
    });

    it("should return scoped eventType fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-eventtype`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "EventType Test",
          startTime: new Date("2025-07-01T13:00:00.000Z"),
          endTime: new Date("2025-07-01T13:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-eventtype`);

      expect(result).not.toBeNull();
      expect(result!.eventType).not.toBeNull();
      expect(result!.eventType!.id).toBe(testEventTypeId);
      expect(result!.eventType).toHaveProperty("minimumRescheduleNotice");
      expect(result!.eventType).toHaveProperty("disableRescheduling");
      expect(result!.eventType).toHaveProperty("userId");
    });

    it("should return scoped payment fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-payment`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Payment Test",
          startTime: new Date("2025-07-01T14:00:00.000Z"),
          endTime: new Date("2025-07-01T14:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
          payment: {
            create: {
              uid: `${uidPrefix}-payment-uid`,
              amount: 1000,
              fee: 50,
              currency: "usd",
              success: true,
              refunded: false,
              data: {},
              externalId: `${uidPrefix}-ext-payment`,
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-payment`);

      expect(result).not.toBeNull();
      expect(result!.payment).toHaveLength(1);
      const payment = result!.payment[0];
      expect(payment.id).toBeDefined();
      expect(payment.success).toBe(true);
      // Verify only scoped fields are returned (id, success)
      expect(Object.keys(payment).sort()).toEqual(["id", "success"].sort());
    });

    it("should return scoped reference fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-refs`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Reference Test",
          startTime: new Date("2025-07-01T15:00:00.000Z"),
          endTime: new Date("2025-07-01T15:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
          references: {
            create: {
              type: "daily_video",
              uid: `${uidPrefix}-ref-uid`,
              meetingId: "meeting-123",
              meetingUrl: "https://daily.co/test",
              meetingPassword: "pass123",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-refs`);

      expect(result).not.toBeNull();
      expect(result!.references).toHaveLength(1);
      const ref = result!.references[0];
      expect(ref.type).toBe("daily_video");
      expect(ref.uid).toBe(`${uidPrefix}-ref-uid`);
      expect(ref.meetingId).toBe("meeting-123");
      expect(ref.meetingUrl).toBe("https://daily.co/test");
      expect(ref.meetingPassword).toBe("pass123");
      // Verify all expected reference fields are present
      const refKeys = Object.keys(ref).sort();
      expect(refKeys).toEqual(
        [
          "id",
          "uid",
          "type",
          "meetingId",
          "meetingUrl",
          "meetingPassword",
          "credentialId",
          "delegationCredentialId",
          "domainWideDelegationCredentialId",
          "externalCalendarId",
          "bookingId",
          "thirdPartyRecurringEventId",
          "deleted",
        ].sort()
      );
    });

    it("should return scoped workflowReminder fields", async () => {
      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-wfr`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Workflow Reminder Test",
          startTime: new Date("2025-07-01T16:00:00.000Z"),
          endTime: new Date("2025-07-01T16:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      // Create workflow reminder linked via bookingUid
      const reminder = await prisma.workflowReminder.create({
        data: {
          bookingUid: `${uidPrefix}-wfr`,
          method: "EMAIL",
          scheduledDate: new Date("2025-07-01T09:00:00.000Z"),
          scheduled: true,
          referenceId: `${uidPrefix}-wfr-ref`,
        },
      });
      createdWorkflowReminderIds.push(reminder.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-wfr`);

      expect(result).not.toBeNull();
      expect(result!.workflowReminders).toHaveLength(1);
      const wfr = result!.workflowReminders[0];
      expect(wfr.id).toBe(reminder.id);
      expect(wfr.referenceId).toBe(`${uidPrefix}-wfr-ref`);
      expect(wfr.method).toBe("EMAIL");
      // Verify only scoped fields are returned (id, referenceId, method)
      expect(Object.keys(wfr).sort()).toEqual(["id", "method", "referenceId"].sort());
    });

    it("should only match ACCEPTED, CANCELLED, or PENDING statuses", async () => {
      // Create a REJECTED booking — should NOT be found
      const rejectedBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-rejected`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.REJECTED,
          title: "Rejected Booking",
          startTime: new Date("2025-07-01T17:00:00.000Z"),
          endTime: new Date("2025-07-01T17:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(rejectedBooking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-rejected`);
      expect(result).toBeNull();

      // Create an ACCEPTED booking — should be found
      const acceptedBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-accepted`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "Accepted Booking",
          startTime: new Date("2025-07-01T18:00:00.000Z"),
          endTime: new Date("2025-07-01T18:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(acceptedBooking.id);

      const acceptedResult = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-accepted`);
      expect(acceptedResult).not.toBeNull();
      expect(acceptedResult!.status).toBe(BookingStatus.ACCEPTED);

      // Create a PENDING booking — should be found
      const pendingBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-pending`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.PENDING,
          title: "Pending Booking",
          startTime: new Date("2025-07-01T19:00:00.000Z"),
          endTime: new Date("2025-07-01T19:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(pendingBooking.id);

      const pendingResult = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-pending`);
      expect(pendingResult).not.toBeNull();
      expect(pendingResult!.status).toBe(BookingStatus.PENDING);

      // Create a CANCELLED booking — should be found
      const cancelledBooking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-cancelled`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.CANCELLED,
          title: "Cancelled Booking",
          startTime: new Date("2025-07-01T20:00:00.000Z"),
          endTime: new Date("2025-07-01T20:30:00.000Z"),
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(cancelledBooking.id);

      const cancelledResult = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-cancelled`);
      expect(cancelledResult).not.toBeNull();
      expect(cancelledResult!.status).toBe(BookingStatus.CANCELLED);
    });

    it("should include destinationCalendar when present", async () => {
      // Create a destination calendar for the user first
      const destCal = await prisma.destinationCalendar.create({
        data: {
          integration: "google_calendar",
          externalId: `${uidPrefix}-cal-ext`,
          userId: testUserId,
        },
      });

      const booking = await prisma.booking.create({
        data: {
          userId: testUserId,
          uid: `${uidPrefix}-destcal`,
          eventTypeId: testEventTypeId,
          status: BookingStatus.ACCEPTED,
          title: "DestCal Test",
          startTime: new Date("2025-07-01T21:00:00.000Z"),
          endTime: new Date("2025-07-01T21:30:00.000Z"),
          destinationCalendarId: destCal.id,
          attendees: {
            create: {
              email: "att@example.com",
              name: "Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
      createdBookingIds.push(booking.id);

      const result = await bookingRepo.findOriginalRescheduledBooking(`${uidPrefix}-destcal`);

      expect(result).not.toBeNull();
      expect(result!.destinationCalendar).not.toBeNull();
      expect(result!.destinationCalendar!.integration).toBe("google_calendar");
      expect(result!.destinationCalendar!.externalId).toBe(`${uidPrefix}-cal-ext`);

      // Clean up destination calendar
      await prisma.destinationCalendar.delete({ where: { id: destCal.id } });
    });
  });
});
