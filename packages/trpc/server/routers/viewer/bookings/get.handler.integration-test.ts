import prisma from "@calcom/prisma";
import kysely from "@calcom/kysely";
import type { Booking, EventType, Team, User } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getBookings } from "./get.handler";

let user1: User;
let user2: User;
let team1: Team;
let eventType1: EventType;
let booking1: Booking;
let booking2: Booking;
let booking3: Booking;
let booking4: Booking;
let teamEventType: EventType;

const timestamp = Date.now();

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
        uid: `getbookings-booking1-${timestamp}`,
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
        uid: `getbookings-booking2-${timestamp}`,
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
        uid: `getbookings-booking3-${timestamp}`,
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
        uid: `getbookings-booking4-${timestamp}`,
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
  });

  afterAll(async () => {
    try {
      const bookingIds = [booking1?.id, booking2?.id, booking3?.id, booking4?.id].filter(Boolean);
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
        await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
      }
      const userIds = [user1?.id, user2?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

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
