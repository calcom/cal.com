import prismaMock from "../../../../tests/libs/__mocks__/prisma";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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

        const bookings = await BookingRepository.getAllBookingsForRoundRobin({
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
  });
});
