import { randomString } from "@calcom/lib/random";
import kysely from "@calcom/kysely";
import prisma from "@calcom/prisma";
import type { Booking, EventType, Team, User } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getBookings } from "./get.handler";

let user1: User;
let user2: User;
let user3: User;
let team1: Team;
let eventType1: EventType;
let booking1: Booking;
let booking2: Booking;
let booking3: Booking;
let booking4: Booking;
let cancelledBooking: Booking;
let pastBooking: Booking;
let teamEventType: EventType;

const timestamp: number = Date.now();

describe("getBookings - integration", () => {
  beforeAll(async () => {
    user1 = await prisma.user.create({
      data: {
        username: `getbookings-user1-${timestamp}`,
        email: `getbookings-user1-${timestamp}@example.com`,
        name: "GetBookings User 1",
      },
    });

    user2 = await prisma.user.create({
      data: {
        username: `getbookings-user2-${timestamp}`,
        email: `getbookings-user2-${timestamp}@example.com`,
        name: "GetBookings User 2",
      },
    });

    team1 = await prisma.team.create({
      data: {
        name: `GetBookings Team ${timestamp}`,
        slug: `getbookings-team-${timestamp}`,
        members: {
          create: {
            userId: user1.id,
            role: MembershipRole.ADMIN,
            accepted: true,
          },
        },
      },
    });

    await prisma.membership.create({
      data: {
        userId: user2.id,
        teamId: team1.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    eventType1 = await prisma.eventType.create({
      data: {
        title: `GetBookings Event ${timestamp}`,
        slug: `getbookings-event-${timestamp}`,
        length: 30,
        userId: user1.id,
      },
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureDate2 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    const futureDate3 = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);

    booking1 = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Booking 1",
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60 * 1000),
        userId: user1.id,
        eventTypeId: eventType1.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: user2.email,
            name: user2.name ?? "User 2",
            timeZone: "UTC",
          },
        },
      },
    });

    booking2 = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Booking 2",
        startTime: futureDate2,
        endTime: new Date(futureDate2.getTime() + 30 * 60 * 1000),
        userId: user1.id,
        eventTypeId: eventType1.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: `getbookings-external-${timestamp}@example.com`,
            name: "External Attendee",
            timeZone: "UTC",
          },
        },
      },
    });

    booking3 = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Booking 3",
        startTime: futureDate3,
        endTime: new Date(futureDate3.getTime() + 30 * 60 * 1000),
        userId: user2.id,
        eventTypeId: eventType1.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: user1.email,
            name: user1.name ?? "User 1",
            timeZone: "UTC",
          },
        },
      },
    });

    teamEventType = await prisma.eventType.create({
      data: {
        title: `GetBookings Team Event ${timestamp}`,
        slug: `getbookings-team-event-${timestamp}`,
        length: 30,
        teamId: team1.id,
      },
    });

    const futureDate4 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    booking4 = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Team Booking - multi branch",
        startTime: futureDate4,
        endTime: new Date(futureDate4.getTime() + 30 * 60 * 1000),
        userId: user1.id,
        eventTypeId: teamEventType.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: user1.email,
            name: user1.name ?? "User 1",
            timeZone: "UTC",
          },
        },
      },
    });

    cancelledBooking = await prisma.booking.create({
      data: {
        uid: `getbookings-cancelled-${timestamp}`,
        title: "Cancelled Booking",
        startTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user1.id,
        eventTypeId: eventType1.id,
        status: BookingStatus.CANCELLED,
        attendees: {
          create: {
            email: user2.email,
            name: user2.name ?? "User 2",
            timeZone: "UTC",
          },
        },
      },
    });

    pastBooking = await prisma.booking.create({
      data: {
        uid: `getbookings-past-${timestamp}`,
        title: "Past Booking",
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        userId: user1.id,
        eventTypeId: eventType1.id,
        status: BookingStatus.ACCEPTED,
        attendees: {
          create: {
            email: `getbookings-past-attendee-${timestamp}@example.com`,
            name: "Past Attendee",
            timeZone: "UTC",
          },
        },
      },
    });

    user3 = await prisma.user.create({
      data: {
        username: `getbookings-user3-${timestamp}`,
        email: `getbookings-user3-${timestamp}@example.com`,
        name: "GetBookings User 3 NoTeam",
      },
    });
  });

  afterAll(async () => {
    try {
      const bookingIds = [
        booking1?.id,
        booking2?.id,
        booking3?.id,
        booking4?.id,
        cancelledBooking?.id,
        pastBooking?.id,
      ].filter(Boolean);
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      const eventTypeIds = [eventType1?.id, teamEventType?.id].filter(Boolean);
      if (eventTypeIds.length > 0) {
        await prisma.eventType.deleteMany({ where: { id: { in: eventTypeIds } } });
      }
      const teamIds = [team1?.id].filter(Boolean);
      if (teamIds.length > 0) {
        await prisma.membership.deleteMany({ where: { teamId: { in: teamIds } } });
        await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
      }
      const userIds = [user1?.id, user2?.id, user3?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("branch 1: user's own bookings", () => {
    it("should return bookings created by the user", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
    });

    it("should not return bookings created by other users when user has no team", async () => {
      const result = await getBookings({
        user: { id: user3.id, email: user3.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).not.toContain(booking1.id);
      expect(bookingIds).not.toContain(booking2.id);
    });
  });

  describe("branch 2: user is an attendee", () => {
    it("should return bookings where user is an attendee", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should return bookings for user2 including those where user2 is an attendee", async () => {
      const result = await getBookings({
        user: { id: user2.id, email: user2.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking3.id);
      expect(bookingIds).toContain(booking1.id);
    });
  });

  describe("branch 3: user is attendee via BookingSeat", () => {
    it("should return a seated booking where user is attendee with a BookingSeat record", async () => {
      const seatedBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-seated-${timestamp}`,
          title: "Seated Booking",
          startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user2.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
        },
      });
      const attendee = await prisma.attendee.create({
        data: {
          email: user1.email,
          name: user1.name ?? "User 1",
          timeZone: "UTC",
          bookingId: seatedBooking.id,
        },
      });
      const bookingSeat = await prisma.bookingSeat.create({
        data: {
          referenceUid: `seat-ref-${timestamp}`,
          bookingId: seatedBooking.id,
          attendeeId: attendee.id,
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(seatedBooking.id);
      } finally {
        await prisma.bookingSeat.delete({ where: { id: bookingSeat.id } });
        await prisma.attendee.delete({ where: { id: attendee.id } });
        await prisma.booking.delete({ where: { id: seatedBooking.id } });
      }
    });
  });

  describe("branch 4: team member is attendee", () => {
    it("should return booking where a team member is an attendee (not the querying user)", async () => {
      const externalUser = await prisma.user.create({
        data: {
          username: `getbookings-ext4-${timestamp}`,
          email: `getbookings-ext4-${timestamp}@example.com`,
          name: "External User Branch4",
        },
      });
      const extEventType = await prisma.eventType.create({
        data: {
          title: `Ext Event B4 ${timestamp}`,
          slug: `ext-event-b4-${timestamp}`,
          length: 30,
          userId: externalUser.id,
        },
      });
      const b4Booking = await prisma.booking.create({
        data: {
          uid: `getbookings-b4-${timestamp}`,
          title: "Branch 4 booking",
          startTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: externalUser.id,
          eventTypeId: extEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: user2.email,
              name: user2.name ?? "User 2",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 100,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(b4Booking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: b4Booking.id } });
        await prisma.booking.delete({ where: { id: b4Booking.id } });
        await prisma.eventType.delete({ where: { id: extEventType.id } });
        await prisma.user.delete({ where: { id: externalUser.id } });
      }
    });
  });

  describe("branch 5: team member attendee via BookingSeat", () => {
    it("should return booking where a team member is attendee via BookingSeat", async () => {
      const externalUser = await prisma.user.create({
        data: {
          username: `getbookings-ext5-${timestamp}`,
          email: `getbookings-ext5-${timestamp}@example.com`,
          name: "External User Branch5",
        },
      });
      const extEventType = await prisma.eventType.create({
        data: {
          title: `Ext Event B5 ${timestamp}`,
          slug: `ext-event-b5-${timestamp}`,
          length: 30,
          userId: externalUser.id,
        },
      });
      const b5Booking = await prisma.booking.create({
        data: {
          uid: `getbookings-b5-${timestamp}`,
          title: "Branch 5 booking",
          startTime: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: externalUser.id,
          eventTypeId: extEventType.id,
          status: BookingStatus.ACCEPTED,
        },
      });
      const attendee = await prisma.attendee.create({
        data: {
          email: user2.email,
          name: user2.name ?? "User 2",
          timeZone: "UTC",
          bookingId: b5Booking.id,
        },
      });
      const bookingSeat = await prisma.bookingSeat.create({
        data: {
          referenceUid: `seat-ref-b5-${timestamp}`,
          bookingId: b5Booking.id,
          attendeeId: attendee.id,
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 100,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(b5Booking.id);
      } finally {
        await prisma.bookingSeat.delete({ where: { id: bookingSeat.id } });
        await prisma.attendee.delete({ where: { id: attendee.id } });
        await prisma.booking.delete({ where: { id: b5Booking.id } });
        await prisma.eventType.delete({ where: { id: extEventType.id } });
        await prisma.user.delete({ where: { id: externalUser.id } });
      }
    });
  });

  describe("branch 6: team event type booking", () => {
    it("should return booking for a team event type even when user is not creator or attendee", async () => {
      const externalUser = await prisma.user.create({
        data: {
          username: `getbookings-ext6-${timestamp}`,
          email: `getbookings-ext6-${timestamp}@example.com`,
          name: "External User Branch6",
        },
      });
      const b6Booking = await prisma.booking.create({
        data: {
          uid: `getbookings-b6-${timestamp}`,
          title: "Branch 6 booking - team event type",
          startTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: externalUser.id,
          eventTypeId: teamEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-ext6-attendee-${timestamp}@example.com`,
              name: "Branch6 Ext Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 100,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(b6Booking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: b6Booking.id } });
        await prisma.booking.delete({ where: { id: b6Booking.id } });
        await prisma.user.delete({ where: { id: externalUser.id } });
      }
    });
  });

  describe("branch 7: team member created booking", () => {
    it("should return booking created by team member even when user is not an attendee", async () => {
      const user2EventType = await prisma.eventType.create({
        data: {
          title: `User2 Personal Event ${timestamp}`,
          slug: `user2-personal-event-${timestamp}`,
          length: 30,
          userId: user2.id,
        },
      });
      const b7Booking = await prisma.booking.create({
        data: {
          uid: `getbookings-b7-${timestamp}`,
          title: "Branch 7 booking - team member created",
          startTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user2.id,
          eventTypeId: user2EventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-b7-attendee-${timestamp}@example.com`,
              name: "Branch7 Ext Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 100,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(b7Booking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: b7Booking.id } });
        await prisma.booking.delete({ where: { id: b7Booking.id } });
        await prisma.eventType.delete({ where: { id: user2EventType.id } });
      }
    });
  });

  describe("userIds filter path", () => {
    it("U1: should return bookings created by the filtered user", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { userIds: [user2.id] },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("U2: should return bookings where filtered user is an attendee", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { userIds: [user2.id] },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
    });

    it("U3: should return bookings where filtered user is attendee via BookingSeat", async () => {
      const seatBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-u3seat-${timestamp}`,
          title: "U3 Seat Booking",
          startTime: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
        },
      });
      const attendee = await prisma.attendee.create({
        data: {
          email: user2.email,
          name: user2.name ?? "User 2",
          timeZone: "UTC",
          bookingId: seatBooking.id,
        },
      });
      const bookingSeat = await prisma.bookingSeat.create({
        data: {
          referenceUid: `seat-ref-u3-${timestamp}`,
          bookingId: seatBooking.id,
          attendeeId: attendee.id,
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: { userIds: [user2.id] },
          take: 100,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(seatBooking.id);
      } finally {
        await prisma.bookingSeat.delete({ where: { id: bookingSeat.id } });
        await prisma.attendee.delete({ where: { id: attendee.id } });
        await prisma.booking.delete({ where: { id: seatBooking.id } });
      }
    });

    it("should throw FORBIDDEN when filtering by userIds outside your team", async () => {
      const outsideUser = await prisma.user.create({
        data: {
          username: `getbookings-outside-${timestamp}`,
          email: `getbookings-outside-${timestamp}@example.com`,
          name: "Outside User",
        },
      });

      try {
        await expect(
          getBookings({
            user: { id: user1.id, email: user1.email, orgId: null },
            prisma,
            kysely,
            bookingListingByStatus: ["upcoming"],
            filters: { userIds: [outsideUser.id] },
            take: 50,
            skip: 0,
          })
        ).rejects.toThrow("You do not have permissions to fetch bookings for specified userIds");
      } finally {
        await prisma.user.delete({ where: { id: outsideUser.id } });
      }
    });

    it("should allow filtering by own userId even without team access", async () => {
      const loneUser = await prisma.user.create({
        data: {
          username: `getbookings-lone-${timestamp}`,
          email: `getbookings-lone-${timestamp}@example.com`,
          name: "Lone User",
        },
      });
      const loneEventType = await prisma.eventType.create({
        data: {
          title: `Lone Event ${timestamp}`,
          slug: `lone-event-${timestamp}`,
          length: 30,
          userId: loneUser.id,
        },
      });
      const loneBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-lone-${timestamp}`,
          title: "Lone User Booking",
          startTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: loneUser.id,
          eventTypeId: loneEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-lone-att-${timestamp}@example.com`,
              name: "Lone Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: loneUser.id, email: loneUser.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: { userIds: [loneUser.id] },
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(loneBooking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: loneBooking.id } });
        await prisma.booking.delete({ where: { id: loneBooking.id } });
        await prisma.eventType.delete({ where: { id: loneEventType.id } });
        await prisma.user.delete({ where: { id: loneUser.id } });
      }
    });
  });

  describe("deduplication and pagination", () => {
    it("should not return duplicate bookings when user is both creator and attendee matches", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const testBookingIds = [booking1.id, booking2.id, booking3.id];
      const relevantBookingIds = result.bookings.map((b) => b.id).filter((id) => testBookingIds.includes(id));

      const uniqueIds = new Set(relevantBookingIds);
      expect(relevantBookingIds.length).toBe(uniqueIds.size);
    });

    it("should return correct totalCount without duplicates", async () => {
      const resultUser1 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const expectedBookingIds = [booking1.id, booking2.id, booking3.id, booking4.id];
      const returnedIds = resultUser1.bookings.map((b) => b.id);
      for (const id of expectedBookingIds) {
        expect(returnedIds).toContain(id);
      }
      expect(resultUser1.totalCount).toBe(resultUser1.bookings.length);
    });

    it("should count booking4 exactly once in totalCount even though it matches multiple union branches", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const booking4Occurrences = result.bookings.filter((b) => b.id === booking4.id);
      expect(booking4Occurrences).toHaveLength(1);
      expect(result.totalCount).toBe(result.bookings.length);
    });

    it("should respect pagination with correct ordering", async () => {
      const page1 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 1,
        skip: 0,
      });

      const page2 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 1,
        skip: 1,
      });

      expect(page1.bookings.length).toBe(1);
      expect(page2.bookings.length).toBe(1);
      expect(page1.bookings[0].id).not.toBe(page2.bookings[0].id);

      const date1 = new Date(page1.bookings[0].startTime);
      const date2 = new Date(page2.bookings[0].startTime);
      expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
    });
  });

  describe("status filtering", () => {
    it("should return cancelled bookings when status is cancelled", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["cancelled"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(cancelledBooking.id);
      expect(bookingIds).not.toContain(booking1.id);
    });

    it("should return past bookings when status is past", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(pastBooking.id);
      expect(bookingIds).not.toContain(booking1.id);
    });

    it("should exclude cancelled bookings from upcoming results", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).not.toContain(cancelledBooking.id);
      expect(bookingIds).not.toContain(pastBooking.id);
    });
  });

  describe("filter: bookingUid", () => {
    it("should return only the booking matching the uid", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].id).toBe(booking1.id);
      expect(result.totalCount).toBe(1);
    });

    it("should return empty when uid does not match any booking", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: "nonexistent-uid-12345" },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("filter: attendeeName", () => {
    it("should filter bookings by attendee name (string)", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { attendeeName: user2.name ?? "" },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).not.toContain(booking2.id);
    });

    it("should filter bookings by attendee name with contains operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "contains", operand: "External" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).not.toContain(booking1.id);
    });
  });

  describe("filter: attendeeEmail", () => {
    it("should filter bookings by attendee email (string)", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { attendeeEmail: user2.email },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).not.toContain(booking3.id);
    });
  });

  describe("filter: eventTypeIds", () => {
    it("should filter bookings by event type", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { eventTypeIds: [teamEventType.id] },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking4.id);
      expect(bookingIds).not.toContain(booking1.id);
    });
  });

  describe("filter: date range", () => {
    it("should filter bookings by afterStartDate", async () => {
      const afterDate = new Date(Date.now() + 8.5 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { afterStartDate: afterDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking3.id);
      expect(bookingIds).toContain(booking4.id);
      expect(bookingIds).not.toContain(booking1.id);
    });

    it("should filter bookings by beforeEndDate", async () => {
      const beforeDate = new Date(Date.now() + 7.5 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { beforeEndDate: beforeDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).not.toContain(booking3.id);
    });
  });

  describe("sort order", () => {
    it("should sort by startTime desc when status is past", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      for (let i = 1; i < result.bookings.length; i++) {
        const prev = new Date(result.bookings[i - 1].startTime).getTime();
        const curr = new Date(result.bookings[i].startTime).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("should sort by endTime desc when sortEnd is provided", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        sort: { sortEnd: "desc" },
        take: 50,
        skip: 0,
      });

      for (let i = 1; i < result.bookings.length; i++) {
        const prev = new Date(result.bookings[i - 1].endTime).getTime();
        const curr = new Date(result.bookings[i].endTime).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("booking enrichment", () => {
    it("should include eventType data in returned bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const b = result.bookings[0];
      expect(b.eventType).toBeDefined();
      expect(b.eventType?.id).toBe(eventType1.id);
      expect(b.eventType?.title).toBe(eventType1.title);
      expect(b.eventType?.slug).toBe(eventType1.slug);
      expect(b.eventType?.length).toBe(eventType1.length);
    });

    it("should include attendees with user enrichment data", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const attendees = result.bookings[0].attendees;
      expect(attendees.length).toBeGreaterThanOrEqual(1);
      const attendee = attendees.find((a) => a.email === user2.email);
      expect(attendee).toBeDefined();
      expect(attendee?.user).toBeDefined();
      expect(attendee?.user?.email).toBe(user2.email);
    });

    it("should include user data (organizer) in returned bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const b = result.bookings[0];
      expect(b.user).toBeDefined();
      expect(b.user?.id).toBe(user1.id);
      expect(b.user?.email).toBe(user1.email);
    });

    it("should include startTime and endTime as ISO strings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      expect(typeof result.bookings[0].startTime).toBe("string");
      expect(typeof result.bookings[0].endTime).toBe("string");
      expect(new Date(result.bookings[0].startTime).toISOString()).toBe(result.bookings[0].startTime);
    });
  });

  describe("no team access path", () => {
    it("should only return own bookings for user with no team membership", async () => {
      const noTeamBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-noteam-${timestamp}`,
          title: "No Team User Booking",
          startTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user3.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-solo-attendee-${timestamp}@example.com`,
              name: "Solo Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user3.id, email: user3.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(noTeamBooking.id);
        expect(bookingIds).not.toContain(booking1.id);
        expect(bookingIds).not.toContain(booking4.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: noTeamBooking.id } });
        await prisma.booking.delete({ where: { id: noTeamBooking.id } });
      }
    });

    it("should return bookings where no-team user is an attendee", async () => {
      const attendeeBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-attendee-noteam-${timestamp}`,
          title: "Booking where user3 is attendee",
          startTime: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: user3.email,
              name: user3.name ?? "User 3",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user3.id, email: user3.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(attendeeBooking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: attendeeBooking.id } });
        await prisma.booking.delete({ where: { id: attendeeBooking.id } });
      }
    });
  });

  describe("totalCount consistency", () => {
    it("should have totalCount >= number of returned bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 2,
        skip: 0,
      });

      expect(result.bookings.length).toBeLessThanOrEqual(2);
      expect(result.totalCount).toBeGreaterThanOrEqual(result.bookings.length);
    });

    it("should have consistent totalCount across pages", async () => {
      const page1 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 2,
        skip: 0,
      });

      const page2 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 2,
        skip: 2,
      });

      expect(page1.totalCount).toBe(page2.totalCount);
    });
  });

  describe("filter: attendeeName operators", () => {
    it("should filter by attendeeName with startsWith operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "startsWith", operand: "GetBookings User" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking1 has attendee user2 ("GetBookings User 2"), booking3 has attendee user1 ("GetBookings User 1")
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking3.id);
      // booking2 has attendee "External Attendee" which doesn't start with "GetBookings User"
      expect(bookingIds).not.toContain(booking2.id);
    });

    it("should filter by attendeeName with endsWith operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "endsWith", operand: "Attendee" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking2 has "External Attendee"
      expect(bookingIds).toContain(booking2.id);
    });

    it("should filter by attendeeName with notEquals operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "notEquals", operand: "External Attendee" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // Should include bookings that have at least one attendee whose name != "External Attendee"
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeName with notContains operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "notContains", operand: "External" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // Should include bookings that have at least one attendee whose name doesn't contain "External"
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeName with isNotEmpty operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "isNotEmpty", operand: "" } },
        },
        take: 50,
        skip: 0,
      });

      // All our test bookings have named attendees, so all should appear
      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeName with equals operator via TextFilterValue", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "equals", operand: user2.name ?? "" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).not.toContain(booking2.id);
    });
  });

  describe("filter: attendeeEmail operators", () => {
    it("should filter by attendeeEmail with contains operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "contains", operand: "external" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking2 has external attendee email
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).not.toContain(booking3.id);
    });

    it("should filter by attendeeEmail with startsWith operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "startsWith", operand: `getbookings-user2` } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking1 has user2 as attendee
      expect(bookingIds).toContain(booking1.id);
    });

    it("should filter by attendeeEmail with endsWith operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "endsWith", operand: "@example.com" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // All our test attendees use @example.com
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeEmail with notEquals operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "notEquals", operand: user2.email } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // Should include bookings with at least one attendee whose email != user2.email
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeEmail with notContains operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "notContains", operand: "external" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking1 (user2 attendee), booking3 (user1 attendee), booking4 (user1 attendee) don't have "external"
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeEmail with isNotEmpty operator", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "isNotEmpty", operand: "" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
      expect(bookingIds).toContain(booking3.id);
    });

    it("should filter by attendeeEmail with equals operator via TextFilterValue", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: { type: "t", data: { operator: "equals", operand: user2.email } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).not.toContain(booking3.id);
    });
  });

  describe("combined attendee filters (intersection)", () => {
    it("should return intersection when both attendeeName and attendeeEmail filters match the same booking", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: user2.name ?? "",
          attendeeEmail: user2.email,
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking1 has user2 as attendee (both name and email match)
      expect(bookingIds).toContain(booking1.id);
      // booking2 has "External Attendee" (name doesn't match user2)
      expect(bookingIds).not.toContain(booking2.id);
    });

    it("should return empty when attendeeName and attendeeEmail filters match different bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: "External Attendee",
          attendeeEmail: user2.email,
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // "External Attendee" is on booking2, user2.email is on booking1 - no intersection
      expect(bookingIds).not.toContain(booking1.id);
      expect(bookingIds).not.toContain(booking2.id);
    });

    it("should handle positive name filter with negative email filter", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: { type: "t", data: { operator: "contains", operand: "User" } },
          attendeeEmail: { type: "t", data: { operator: "notContains", operand: "external" } },
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking1 has attendee "GetBookings User 2" (name contains "User", email not "external") -> included
      expect(bookingIds).toContain(booking1.id);
    });
  });

  describe("filter: date range - updatedAt and createdAt", () => {
    it("should filter bookings by afterCreatedDate", async () => {
      // All test bookings were created "now", so using a past date should include them
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { afterCreatedDate: pastDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking2.id);
    });

    it("should filter bookings by beforeCreatedDate", async () => {
      // Using a far future date should include all bookings
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { beforeCreatedDate: futureDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
    });

    it("should return empty when beforeCreatedDate is in the past", async () => {
      const veryOldDate = new Date("2000-01-01").toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { beforeCreatedDate: veryOldDate },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should filter bookings by afterUpdatedDate", async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { afterUpdatedDate: pastDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
    });

    it("should filter bookings by beforeUpdatedDate", async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { beforeUpdatedDate: futureDate },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
    });

    it("should combine afterStartDate and afterCreatedDate filters", async () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const futureStart = new Date(Date.now() + 8.5 * 24 * 60 * 60 * 1000).toISOString();
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          afterStartDate: futureStart,
          afterCreatedDate: recentDate,
        },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // Only bookings with startTime after futureStart AND created recently
      expect(bookingIds).toContain(booking3.id);
      expect(bookingIds).not.toContain(booking1.id);
    });
  });

  describe("filter: teamIds", () => {
    it("should filter bookings by teamIds", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { teamIds: [team1.id] },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // booking4 uses teamEventType (team1) and other bookings use eventType1 (personal)
      expect(bookingIds).toContain(booking4.id);
    });

    it("should not filter when teamIds match no event types (empty eventTypeIds acts as no-op)", async () => {
      // When teamIds don't match any event types, getEventTypeIdsFromTeamIdsFilter returns [],
      // and since eventTypeIdsFromTeamIdsFilter.length > 0 is false, no filter is applied.
      // This means all bookings are returned (the filter is effectively a no-op).
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { teamIds: [999999] },
        take: 50,
        skip: 0,
      });

      // All upcoming bookings are returned since the empty eventTypeIds array means no filtering
      expect(result.bookings.length).toBeGreaterThan(0);
    });
  });

  describe("sort: createdAt and updatedAt", () => {
    it("should sort by startTime asc explicitly", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        sort: { sortStart: "asc" },
        take: 50,
        skip: 0,
      });

      for (let i = 1; i < result.bookings.length; i++) {
        const prev = new Date(result.bookings[i - 1].startTime).getTime();
        const curr = new Date(result.bookings[i].startTime).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    });

    it("should sort by startTime desc explicitly", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        sort: { sortStart: "desc" },
        take: 50,
        skip: 0,
      });

      for (let i = 1; i < result.bookings.length; i++) {
        const prev = new Date(result.bookings[i - 1].startTime).getTime();
        const curr = new Date(result.bookings[i].startTime).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe("status: unconfirmed and recurring", () => {
    it("should return unconfirmed (pending) bookings", async () => {
      const pendingBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-pending-${timestamp}`,
          title: "Pending Booking",
          startTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.PENDING,
          attendees: {
            create: {
              email: `getbookings-pending-att-${timestamp}@example.com`,
              name: "Pending Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["unconfirmed"],
          filters: {},
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(pendingBooking.id);
        // Should not contain accepted bookings
        expect(bookingIds).not.toContain(booking1.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: pendingBooking.id } });
        await prisma.booking.delete({ where: { id: pendingBooking.id } });
      }
    });

    it("should return recurring bookings", async () => {
      const recurringId = `getbookings-recurring-${timestamp}`;
      const recurringBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-recurring-uid-${timestamp}`,
          title: "Recurring Booking",
          startTime: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          recurringEventId: recurringId,
          attendees: {
            create: {
              email: `getbookings-recurring-att-${timestamp}@example.com`,
              name: "Recurring Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["recurring"],
          filters: {},
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(recurringBooking.id);
        // Non-recurring accepted bookings should not appear
        expect(bookingIds).not.toContain(booking1.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: recurringBooking.id } });
        await prisma.booking.delete({ where: { id: recurringBooking.id } });
      }
    });
  });

  describe("multiple statuses combined", () => {
    it("should return both past and cancelled bookings when both statuses requested", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past", "cancelled"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(pastBooking.id);
      expect(bookingIds).toContain(cancelledBooking.id);
      // Should not contain upcoming bookings
      expect(bookingIds).not.toContain(booking1.id);
    });

    it("should return both upcoming and cancelled bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming", "cancelled"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(cancelledBooking.id);
    });
  });

  describe("special characters in attendee filters", () => {
    it("should handle ILIKE special characters in attendeeName contains filter", async () => {
      // Create a booking with special chars in attendee name
      const specialBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-special-${timestamp}`,
          title: "Special Char Booking",
          startTime: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-special-${timestamp}@example.com`,
              name: "Name_With%Special\\Chars",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        // Search for the literal underscore - should not match as wildcard
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: { type: "t", data: { operator: "contains", operand: "_With%" } },
          },
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(specialBooking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: specialBooking.id } });
        await prisma.booking.delete({ where: { id: specialBooking.id } });
      }
    });

    it("should handle ILIKE special characters in attendeeName equals filter", async () => {
      const specialBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-special2-${timestamp}`,
          title: "Special Char Booking 2",
          startTime: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `getbookings-special2-${timestamp}@example.com`,
              name: "100% Match_Test",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {
            attendeeName: "100% Match_Test",
          },
          take: 50,
          skip: 0,
        });

        const bookingIds = result.bookings.map((b) => b.id);
        expect(bookingIds).toContain(specialBooking.id);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: specialBooking.id } });
        await prisma.booking.delete({ where: { id: specialBooking.id } });
      }
    });
  });

  describe("empty attendee filter results (sentinel)", () => {
    it("should return empty when attendeeName matches no attendees", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: "Completely Nonexistent Name ZZZZZ",
        },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should return empty when attendeeEmail matches no attendees", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: "nonexistent-99999@doesnotexist.zzz",
        },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should return empty when both name and email filters match no intersection", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: "Nonexistent Name",
          attendeeEmail: "nonexistent@doesnotexist.zzz",
        },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("userIds filter with multiple users", () => {
    it("should return bookings for multiple filtered userIds", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { userIds: [user1.id, user2.id] },
        take: 50,
        skip: 0,
      });

      const bookingIds = result.bookings.map((b) => b.id);
      // Should include bookings created by user1 and user2, plus those where they are attendees
      expect(bookingIds).toContain(booking1.id);
      expect(bookingIds).toContain(booking3.id);
    });
  });

  describe("booking enrichment edge cases", () => {
    it("should include recurringInfo in results", async () => {
      const recurringId = `getbookings-recinfo-${timestamp}`;
      const recurringBooking = await prisma.booking.create({
        data: {
          uid: `getbookings-recinfo-uid-${timestamp}`,
          title: "Recurring Info Booking",
          startTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          recurringEventId: recurringId,
          attendees: {
            create: {
              email: `getbookings-recinfo-att-${timestamp}@example.com`,
              name: "RecInfo Attendee",
              timeZone: "UTC",
            },
          },
        },
      });

      try {
        const result = await getBookings({
          user: { id: user1.id, email: user1.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["upcoming"],
          filters: {},
          take: 50,
          skip: 0,
        });

        expect(result.recurringInfo).toBeDefined();
        expect(Array.isArray(result.recurringInfo)).toBe(true);
        const recInfo = result.recurringInfo.find((r) => r.recurringEventId === recurringId);
        expect(recInfo).toBeDefined();
        expect(recInfo!.count).toBeGreaterThanOrEqual(1);
      } finally {
        await prisma.attendee.deleteMany({ where: { bookingId: recurringBooking.id } });
        await prisma.booking.delete({ where: { id: recurringBooking.id } });
      }
    });

    it("should include payment data in enriched bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const b = result.bookings[0];
      // payment should be an array (possibly empty)
      expect(Array.isArray(b.payment)).toBe(true);
    });

    it("should include booking references in enriched bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const b = result.bookings[0];
      expect(Array.isArray(b.references)).toBe(true);
    });

    it("should include eventType metadata parsed correctly", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: { bookingUid: booking1.uid },
        take: 50,
        skip: 0,
      });

      expect(result.bookings).toHaveLength(1);
      const b = result.bookings[0];
      expect(b.eventType).toBeDefined();
      expect(b.eventType?.metadata).toBeDefined();
      expect(b.eventType?.price).toBe(0);
      expect(b.eventType?.currency).toBe("usd");
    });
  });

  describe("orgId propagation in integration context", () => {
    it("should work correctly with orgId set to null", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      expect(result.bookings.length).toBeGreaterThan(0);
    });

    it("should work correctly with orgId set to undefined", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 50,
        skip: 0,
      });

      expect(result.bookings.length).toBeGreaterThan(0);
    });
  });

  describe("ILIKE special character escaping", () => {
    let wildcardBooking: Booking;
    let decoyBooking: Booking;
    const escTimestamp = Date.now();

    beforeAll(async () => {
      wildcardBooking = await prisma.booking.create({
        data: {
          uid: `esc-wildcard-${escTimestamp}`,
          title: "Wildcard Attendee Booking",
          startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `john_100%done_${escTimestamp}@example.com`,
              name: `John_100%Done_${escTimestamp}`,
              timeZone: "UTC",
            },
          },
        },
      });

      decoyBooking = await prisma.booking.create({
        data: {
          uid: `esc-decoy-${escTimestamp}`,
          title: "Decoy Attendee Booking",
          startTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          userId: user1.id,
          eventTypeId: eventType1.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: {
              email: `johnX100Xdone_${escTimestamp}@example.com`,
              name: `JohnX100XDone_${escTimestamp}`,
              timeZone: "UTC",
            },
          },
        },
      });
    });

    afterAll(async () => {
      const ids = [wildcardBooking?.id, decoyBooking?.id].filter(Boolean);
      if (ids.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: ids } } });
        await prisma.booking.deleteMany({ where: { id: { in: ids } } });
      }
    });

    it("startsWith: should treat _ and % as literal characters", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: {
            type: "t" as const,
            data: { operator: "startsWith" as const, operand: `John_100%Done` },
          },
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(wildcardBooking.id);
      expect(ids).not.toContain(decoyBooking.id);
    });

    it("contains: should treat % as literal, not multi-char wildcard", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: {
            type: "t" as const,
            data: { operator: "contains" as const, operand: "100%Done" },
          },
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(wildcardBooking.id);
      expect(ids).not.toContain(decoyBooking.id);
    });

    it("endsWith: should treat _ as literal, not single-char wildcard", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: {
            type: "t" as const,
            data: { operator: "endsWith" as const, operand: `%Done_${escTimestamp}` },
          },
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(wildcardBooking.id);
      expect(ids).not.toContain(decoyBooking.id);
    });

    it("notContains: should treat _ and % as literal characters", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeName: {
            type: "t" as const,
            data: { operator: "notContains" as const, operand: "_100%" },
          },
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).not.toContain(wildcardBooking.id);
      expect(ids).toContain(decoyBooking.id);
    });

    it("contains on email: should escape special chars", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {
          attendeeEmail: {
            type: "t" as const,
            data: { operator: "contains" as const, operand: "_100%done" },
          },
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(wildcardBooking.id);
      expect(ids).not.toContain(decoyBooking.id);
    });
  });
});
