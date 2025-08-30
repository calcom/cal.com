import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BookingStatus, RRTimestampBasis } from "@calcom/prisma/enums";

import { BookingRepository } from "./booking";

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

  describe("PENDING bookings with requiresConfirmationWillBlockSlot", () => {
    it("should include PENDING bookings where user is the host/organizer", async () => {
      await prismaMock.booking.create({
        data: {
          userId: 1,
          uid: "pending-host-booking",
          eventTypeId: 1,
          status: BookingStatus.PENDING,
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "Pending Host Booking",
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Attendee",
              timeZone: "America/Toronto",
            },
          },
        },
      });

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "organizer1@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        eventTypeId: 1,
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].uid).toBe("pending-host-booking");
    });

    it("should include PENDING bookings where user is an attendee", async () => {
      await prismaMock.booking.create({
        data: {
          userId: 2,
          uid: "pending-attendee-booking",
          eventTypeId: 1,
          status: BookingStatus.PENDING,
          startTime: new Date("2025-05-01T14:00:00.000Z"),
          endTime: new Date("2025-05-01T15:00:00.000Z"),
          title: "Pending Attendee Booking",
          attendees: {
            create: {
              email: "organizer1@example.com", // User 1 is attendee
              name: "Organizer As Attendee",
              timeZone: "America/Toronto",
            },
          },
        },
      });

      const bookingRepo = new BookingRepository(prismaMock);
      const userIdAndEmailMap = new Map([[1, "organizer1@example.com"]]);

      const bookings = await bookingRepo.findAllExistingBookingsForEventTypeBetween({
        eventTypeId: 1,
        startDate: new Date("2025-05-01T13:00:00.000Z"),
        endDate: new Date("2025-05-01T16:00:00.000Z"),
        userIdAndEmailMap,
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].uid).toBe("pending-attendee-booking");
    });
  });
});
