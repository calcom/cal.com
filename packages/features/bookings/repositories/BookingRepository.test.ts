import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";

import { BookingRepository } from "./BookingRepository";

const createAttendeeNoShowTestBookings = async () => {
  await Promise.all([
    prismaMock.booking.create({
      data: {
        userId: 1,
        uid: "123",
        eventTypeId: 1,
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
    }),
    prismaMock.booking.create({
      data: {
        userId: 1,
        uid: "123",
        eventTypeId: 1,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: "test1@example.com",
            noShow: true,
            name: "Test 1",
            timeZone: "America/Toronto",
          },
        },
        startTime: new Date("2025-05-01T00:00:00.000Z"),
        endTime: new Date("2025-05-01T01:00:00.000Z"),
        title: "Test Event",
      },
    }),
  ]);
};

const createHostNoShowTestBookings = async () => {
  await Promise.all([
    prismaMock.booking.create({
      data: {
        userId: 1,
        uid: "123",
        eventTypeId: 1,
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
        noShowHost: false,
      },
    }),
    prismaMock.booking.create({
      data: {
        userId: 1,
        uid: "123",
        eventTypeId: 1,
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
        noShowHost: true,
      },
    }),
  ]);
};

describe("BookingRepository", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2025-05-01T00:00:00.000Z"));
    vi.resetAllMocks();
  });
  describe("getAllBookingsForRoundRobin", () => {
    describe("includeNoShowInRRCalculation", () => {
      it("it should not include bookings where the attendee is a no show", async () => {
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(1);
      });
      it("it should include bookings where the attendee is a no show", async () => {
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(2);
      });
      it("it should not include bookings where the host is a no show", async () => {
        await createHostNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(1);
      });
      it("it should include bookings where the host is a no show", async () => {
        await createHostNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(2);
      });
      it("it should not include bookings where the host or an attendee is a no show", async () => {
        await createHostNoShowTestBookings();
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: false,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(2);
      });
      it("it should include bookings where the host or an attendee is a no show", async () => {
        await createHostNoShowTestBookings();
        await createAttendeeNoShowTestBookings();

        const bookingRepo = new BookingRepository(prismaMock);
        const bookings = await bookingRepo.getAllBookingsForRoundRobin({
          users: [{ id: 1, email: "organizer1@example.com" }],
          eventTypeId: 1,
          startDate: new Date(),
          endDate: new Date(),
          includeNoShowInRRCalculation: true,
          virtualQueuesData: null,
        });

        expect(bookings).toHaveLength(4);
      });
    });
    it("should use start time as timestamp basis for the booking count", async () => {
      await Promise.all([
        prismaMock.booking.create({
          data: {
            userId: 1,
            uid: "booking_may",
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "test1@example.com",
                noShow: false,
                name: "Test 1",
                timeZone: "America/Toronto",
              },
            },
            startTime: new Date("2025-05-26T00:00:00.000Z"),
            endTime: new Date("2025-05-26T01:00:00.000Z"),
            createdAt: new Date("2025-05-03T00:00:00.000Z"),
            title: "Test Event",
          },
        }),
        prismaMock.booking.create({
          data: {
            userId: 1,
            uid: "booking_june",
            eventTypeId: 1,
            status: BookingStatus.ACCEPTED,
            attendees: {
              create: {
                email: "test1@example.com",
                noShow: true,
                name: "Test 1",
                timeZone: "America/Toronto",
              },
            },
            startTime: new Date("2025-06-26T00:00:00.000Z"),
            endTime: new Date("2025-06-26T01:00:00.000Z"),
            createdAt: new Date("2025-05-03T00:00:00.000Z"),
            title: "Test Event",
          },
        }),
      ]);

      const bookingRepo = new BookingRepository(prismaMock);
      const bookings = await bookingRepo.getAllBookingsForRoundRobin({
        users: [{ id: 1, email: "organizer1@example.com" }],
        eventTypeId: 1,
        startDate: new Date("2025-06-01T00:00:00.000Z"),
        endDate: new Date("2025-06-30T23:59:00.000Z"),
        includeNoShowInRRCalculation: true,
        virtualQueuesData: null,
        rrTimestampBasis: RRTimestampBasis.START_TIME,
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].startTime.toISOString()).toBe(new Date("2025-06-26T00:00:00.000Z").toISOString());
    });
  });
});

describe("_findAllExistingBookingsForEventTypeBetween", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2025-05-01T12:00:00.000Z"));
    vi.resetAllMocks();
  });

  describe("Cross-event-type PENDING bookings with requiresConfirmationWillBlockSlot", () => {
    it("PENDING booking with block slot enabled should block slots globally for all event types", async () => {
      // Create Event Type A
      await prismaMock.eventType.create({
        data: {
          id: 1,
          title: "Event Type A",
          slug: "event-type-a",
          description: "Event Type A with slot blocking",
          userId: 1,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });

      // Create Event Type B
      await prismaMock.eventType.create({
        data: {
          id: 2,
          title: "Event Type B",
          slug: "event-type-b",
          description: "Event Type B",
          userId: 1,
          length: 60,
          requiresConfirmation: false,
          requiresConfirmationWillBlockSlot: false,
        },
      });

      // create a PENDING booking for Event Type A
      await prismaMock.booking.create({
        data: {
          userId: 1,
          uid: "pending-booking-type-a",
          eventTypeId: 1,
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

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "test1@example.com"]]);

      // finding PENDING bookings that has blocked slots globally for all event types
      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(1);
    });

    it("should NOT include PENDING bookings that don't block slots", async () => {
      await prismaMock.eventType.create({
        data: {
          id: 3,
          title: "Non-blocking Event Type",
          slug: "non-blocking-event-type",
          description: "This event type doesn't block slots",
          userId: 1,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: false,
        },
      });

      await prismaMock.booking.create({
        data: {
          userId: 1,
          uid: "pending-non-blocking",
          eventTypeId: 3,
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

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "test1@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(0);
    });

    it("should remove duplicate PENDING bookings when organizer books their own event type", async () => {
      // Create event type with slot blocking
      await prismaMock.eventType.create({
        data: {
          id: 4,
          title: "Self-Booking Event Type",
          slug: "self-booking-event-type",
          description: "Event type for self-booking scenario",
          userId: 1,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });

      // Create a PENDING booking where organizer is also an attendee (self-booking)
      await prismaMock.booking.create({
        data: {
          userId: 1,
          uid: "pending-self-booking",
          eventTypeId: 4,
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

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "organizer@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      // Should return only 1 booking, not 2 (duplicate removed)
      // The booking appears in both pendingAndBlockingBookingsWhereUserIsOrganizer
      // and pendingAndBlockingBookingsWhereUserIsAttendee queries
      expect(bookings).toHaveLength(1);
      expect(bookings[0].uid).toBe("pending-self-booking");
      expect(bookings[0].status).toBe(BookingStatus.PENDING);
    });

    it("should include separate PENDING bookings when organizer and attendee are different people", async () => {
      // Create event type with slot blocking
      await prismaMock.eventType.create({
        data: {
          id: 5,
          title: "Multi-User Event Type",
          slug: "multi-user-event-type",
          description: "Event type for multi-user scenario",
          userId: 1,
          length: 60,
          requiresConfirmation: true,
          requiresConfirmationWillBlockSlot: true,
        },
      });

      // Create a PENDING booking where organizer hosts for a different attendee
      await prismaMock.booking.create({
        data: {
          userId: 1,
          uid: "pending-organizer-booking",
          eventTypeId: 5,
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

      // Create another PENDING booking where organizer is an attendee on someone else's event
      await prismaMock.booking.create({
        data: {
          userId: 2,
          uid: "pending-attendee-booking",
          eventTypeId: 5,
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

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "organizer@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T18:00:00.000Z"),
        userIdAndEmailMap,
      });

      // Should return both bookings (2 distinct bookings, no duplicates)
      expect(bookings).toHaveLength(2);
      expect(bookings.map((b) => b.uid)).toContain("pending-organizer-booking");
      expect(bookings.map((b) => b.uid)).toContain("pending-attendee-booking");
    });
  });
});
