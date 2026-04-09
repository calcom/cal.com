import { randomString } from "@calcom/lib/random";
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

// Past bookings at various time depths for progressive window tests
let pastBookingRecent: Booking; // 2 days ago — within 1-week window
let pastBooking2WeeksAgo: Booking; // 2 weeks ago — within 4-week window
let pastBooking6WeeksAgo: Booking; // 6 weeks ago — within 12-week window
let pastBooking6MonthsAgo: Booking; // ~6 months ago — within 48-week window
let pastBooking2YearsAgo: Booking; // 2 years ago — only found in unbounded window
let pastBookingCancelled: Booking; // 3 days ago, cancelled — should be excluded

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

    // Past bookings at various time depths for progressive window tests
    const DAY = 24 * 60 * 60 * 1000;
    const DURATION = 30 * 60 * 1000;

    const pastDates = [
      { days: 2, ref: "pastBookingRecent" },
      { days: 14, ref: "pastBooking2WeeksAgo" },
      { days: 42, ref: "pastBooking6WeeksAgo" },
      { days: 180, ref: "pastBooking6MonthsAgo" },
      { days: 730, ref: "pastBooking2YearsAgo" },
    ] as const;

    for (const { days, ref } of pastDates) {
      const start = new Date(Date.now() - days * DAY);
      const booking = await prisma.booking.create({
        data: {
          uid: `booking-uid-${randomString()}`,
          title: `Past booking ${days}d ago`,
          startTime: start,
          endTime: new Date(start.getTime() + DURATION),
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
      if (ref === "pastBookingRecent") pastBookingRecent = booking;
      if (ref === "pastBooking2WeeksAgo") pastBooking2WeeksAgo = booking;
      if (ref === "pastBooking6WeeksAgo") pastBooking6WeeksAgo = booking;
      if (ref === "pastBooking6MonthsAgo") pastBooking6MonthsAgo = booking;
      if (ref === "pastBooking2YearsAgo") pastBooking2YearsAgo = booking;
    }

    // Cancelled past booking — should never appear in past results
    const cancelledStart = new Date(Date.now() - 3 * DAY);
    pastBookingCancelled = await prisma.booking.create({
      data: {
        uid: `booking-uid-${randomString()}`,
        title: "Past cancelled booking",
        startTime: cancelledStart,
        endTime: new Date(cancelledStart.getTime() + DURATION),
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
  });

  afterAll(async () => {
    try {
      const bookingIds = [
        booking1?.id,
        booking2?.id,
        booking3?.id,
        booking4?.id,
        pastBookingRecent?.id,
        pastBooking2WeeksAgo?.id,
        pastBooking6WeeksAgo?.id,
        pastBooking6MonthsAgo?.id,
        pastBooking2YearsAgo?.id,
        pastBookingCancelled?.id,
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

  it("should return hasMore=true when page is full", async () => {
    const result = await getBookings({
      user: { id: user1.id, email: user1.email, orgId: null },
      prisma,
      kysely,
      bookingListingByStatus: ["upcoming"],
      filters: {},
      take: 1,
      skip: 0,
    });

    expect(result.bookings).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it("should return hasMore=false when page is not full", async () => {
    const result = await getBookings({
      user: { id: user1.id, email: user1.email, orgId: null },
      prisma,
      kysely,
      bookingListingByStatus: ["upcoming"],
      filters: {},
      take: 50,
      skip: 0,
    });

    // 4 bookings < take of 50
    expect(result.bookings.length).toBeLessThan(50);
    expect(result.hasMore).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Past bookings — progressive window queries
  // -----------------------------------------------------------------------

  describe("past bookings progressive window", () => {
    it("should find a recent past booking (within 1-week window)", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(pastBookingRecent.id);
    });

    it("should find bookings across all time windows", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(pastBookingRecent.id);
      expect(ids).toContain(pastBooking2WeeksAgo.id);
      expect(ids).toContain(pastBooking6WeeksAgo.id);
      expect(ids).toContain(pastBooking6MonthsAgo.id);
      expect(ids).toContain(pastBooking2YearsAgo.id);
    });

    it("should return past bookings in descending startTime order across windows", async () => {
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

    it("should not return duplicate IDs across progressive windows", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids.length).toBe(new Set(ids).size);
    });

    it("should exclude cancelled bookings from past results", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      expect(ids).not.toContain(pastBookingCancelled.id);
    });

    it("should have all past bookings with endTime in the past", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      const now = Date.now();
      for (const booking of result.bookings) {
        expect(new Date(booking.endTime).getTime()).toBeLessThanOrEqual(now);
      }
    });

    it("should paginate past bookings correctly across windows", async () => {
      const page1 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 2,
        skip: 0,
      });

      const page2 = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 2,
        skip: 2,
      });

      expect(page1.bookings.length).toBe(2);
      expect(page2.bookings.length).toBe(2);

      // No overlap
      const page1Ids = new Set(page1.bookings.map((b) => b.id));
      for (const b of page2.bookings) {
        expect(page1Ids.has(b.id)).toBe(false);
      }

      // Page 1 has more recent bookings than page 2
      const page1Oldest = new Date(page1.bookings[page1.bookings.length - 1].startTime).getTime();
      const page2Newest = new Date(page2.bookings[0].startTime).getTime();
      expect(page1Oldest).toBeGreaterThanOrEqual(page2Newest);
    });

    it("should have correct totalCount for past bookings", async () => {
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      // totalCount should match the number returned (page isn't full)
      expect(result.totalCount).toBe(result.bookings.length);
      // We created 5 non-cancelled past bookings
      expect(result.bookings.length).toBeGreaterThanOrEqual(5);
    });

    it("should widen windows when take exceeds first window results", async () => {
      // Request exactly 5 — this forces the query to go beyond the 1-week
      // window since only 1 past booking (2 days ago) is in that range
      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 5,
        skip: 0,
      });

      expect(result.bookings.length).toBeGreaterThanOrEqual(5);

      const ids = result.bookings.map((b) => b.id);
      // Must include bookings from beyond the 1-week window
      expect(ids).toContain(pastBooking2WeeksAgo.id);
    });

    it("should respect afterStartDate filter with past progressive window", async () => {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await getBookings({
        user: { id: user1.id, email: user1.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {
          afterStartDate: threeMonthsAgo.toISOString(),
        },
        take: 50,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);
      // Should include bookings within the last 3 months
      expect(ids).toContain(pastBookingRecent.id);
      expect(ids).toContain(pastBooking2WeeksAgo.id);
      expect(ids).toContain(pastBooking6WeeksAgo.id);
      // Should exclude bookings older than 3 months
      expect(ids).not.toContain(pastBooking6MonthsAgo.id);
      expect(ids).not.toContain(pastBooking2YearsAgo.id);
    });

    it("should return past bookings for user2 who is an attendee", async () => {
      const result = await getBookings({
        user: { id: user2.id, email: user2.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 50,
        skip: 0,
      });

      // user2 is an attendee on all past bookings created by user1
      const ids = result.bookings.map((b) => b.id);
      expect(ids).toContain(pastBookingRecent.id);
      expect(ids).toContain(pastBooking2YearsAgo.id);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-team booking visibility (security)
  // -----------------------------------------------------------------------

  describe("cross-team booking visibility", () => {
    let teamX: Team;
    let teamY: Team;
    let teamXAdmin: User;
    let sharedMember: User;
    let teamXEventType: EventType;
    let teamYEventType: EventType;
    let personalEventType: EventType;
    let bookingTeamX: Booking;
    let bookingTeamY: Booking;
    let bookingPersonal: Booking;
    let pastBookingTeamX: Booking;
    let pastBookingTeamY: Booking;

    beforeAll(async () => {
      const ts = Date.now();

      teamXAdmin = await prisma.user.create({
        data: {
          username: `crossteam-admin-${ts}`,
          email: `crossteam-admin-${ts}@example.com`,
          name: "Team X Admin",
        },
      });

      sharedMember = await prisma.user.create({
        data: {
          username: `crossteam-shared-${ts}`,
          email: `crossteam-shared-${ts}@example.com`,
          name: "Shared Member",
        },
      });

      teamX = await prisma.team.create({
        data: {
          name: `Cross Team X ${ts}`,
          slug: `crossteam-x-${ts}`,
          members: {
            createMany: {
              data: [
                { userId: teamXAdmin.id, role: MembershipRole.ADMIN, accepted: true },
                { userId: sharedMember.id, role: MembershipRole.MEMBER, accepted: true },
              ],
            },
          },
        },
      });

      teamY = await prisma.team.create({
        data: {
          name: `Cross Team Y ${ts}`,
          slug: `crossteam-y-${ts}`,
          members: {
            create: { userId: sharedMember.id, role: MembershipRole.MEMBER, accepted: true },
          },
        },
      });

      teamXEventType = await prisma.eventType.create({
        data: { title: `Team X Event ${ts}`, slug: `teamx-event-${ts}`, length: 30, teamId: teamX.id },
      });

      teamYEventType = await prisma.eventType.create({
        data: { title: `Team Y Event ${ts}`, slug: `teamy-event-${ts}`, length: 30, teamId: teamY.id },
      });

      personalEventType = await prisma.eventType.create({
        data: { title: `Personal Event ${ts}`, slug: `personal-event-${ts}`, length: 30, userId: sharedMember.id },
      });

      const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Shared member's booking on Team X's event type — Team X admin SHOULD see this
      bookingTeamX = await prisma.booking.create({
        data: {
          uid: `booking-teamx-${randomString()}`,
          title: "Team X Booking",
          startTime: future(11),
          endTime: new Date(future(11).getTime() + 30 * 60 * 1000),
          userId: sharedMember.id,
          eventTypeId: teamXEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: { email: `external-${ts}@example.com`, name: "External", timeZone: "UTC" },
          },
        },
      });

      // Shared member's booking on Team Y's event type — Team X admin should NOT see this
      bookingTeamY = await prisma.booking.create({
        data: {
          uid: `booking-teamy-${randomString()}`,
          title: "Team Y Booking",
          startTime: future(12),
          endTime: new Date(future(12).getTime() + 30 * 60 * 1000),
          userId: sharedMember.id,
          eventTypeId: teamYEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: { email: `external2-${ts}@example.com`, name: "External 2", timeZone: "UTC" },
          },
        },
      });

      // Shared member's booking on personal event type — Team X admin SHOULD see this
      bookingPersonal = await prisma.booking.create({
        data: {
          uid: `booking-personal-${randomString()}`,
          title: "Personal Booking",
          startTime: future(13),
          endTime: new Date(future(13).getTime() + 30 * 60 * 1000),
          userId: sharedMember.id,
          eventTypeId: personalEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: { email: `external3-${ts}@example.com`, name: "External 3", timeZone: "UTC" },
          },
        },
      });

      const past = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Past booking on Team X event type — Team X admin SHOULD see
      pastBookingTeamX = await prisma.booking.create({
        data: {
          uid: `past-teamx-${randomString()}`,
          title: "Past Team X Booking",
          startTime: past(3),
          endTime: new Date(past(3).getTime() + 30 * 60 * 1000),
          userId: sharedMember.id,
          eventTypeId: teamXEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: { email: `external4-${ts}@example.com`, name: "External 4", timeZone: "UTC" },
          },
        },
      });

      // Past booking on Team Y event type — Team X admin should NOT see
      pastBookingTeamY = await prisma.booking.create({
        data: {
          uid: `past-teamy-${randomString()}`,
          title: "Past Team Y Booking",
          startTime: past(4),
          endTime: new Date(past(4).getTime() + 30 * 60 * 1000),
          userId: sharedMember.id,
          eventTypeId: teamYEventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            create: { email: `external5-${ts}@example.com`, name: "External 5", timeZone: "UTC" },
          },
        },
      });
    }, 30_000);

    afterAll(async () => {
      const bookingIds = [bookingTeamX?.id, bookingTeamY?.id, bookingPersonal?.id, pastBookingTeamX?.id, pastBookingTeamY?.id].filter(Boolean);
      if (bookingIds.length) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      const etIds = [teamXEventType?.id, teamYEventType?.id, personalEventType?.id].filter(Boolean);
      if (etIds.length) await prisma.eventType.deleteMany({ where: { id: { in: etIds } } });
      const teamIds = [teamX?.id, teamY?.id].filter(Boolean);
      if (teamIds.length) await prisma.team.deleteMany({ where: { id: { in: teamIds } } });
      const userIds = [teamXAdmin?.id, sharedMember?.id].filter(Boolean);
      if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    it("should NOT show Team Y bookings to Team X admin", async () => {
      const result = await getBookings({
        user: { id: teamXAdmin.id, email: teamXAdmin.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 200,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);

      // Team X admin should see: Team X booking + personal booking
      expect(ids).toContain(bookingTeamX.id);
      expect(ids).toContain(bookingPersonal.id);

      // Team X admin should NOT see Team Y booking
      expect(ids).not.toContain(bookingTeamY.id);
    });

    it("should show Team Y bookings to the shared member themselves", async () => {
      const result = await getBookings({
        user: { id: sharedMember.id, email: sharedMember.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["upcoming"],
        filters: {},
        take: 200,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);

      // Shared member should see all their own bookings
      expect(ids).toContain(bookingTeamX.id);
      expect(ids).toContain(bookingTeamY.id);
      expect(ids).toContain(bookingPersonal.id);
    });

    it("past bookings: should NOT show Team Y past bookings to Team X admin", async () => {
      const result = await getBookings({
        user: { id: teamXAdmin.id, email: teamXAdmin.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 200,
        skip: 0,
      });

      const ids = result.bookings.map((b) => b.id);

      expect(ids).toContain(pastBookingTeamX.id);
      expect(ids).not.toContain(pastBookingTeamY.id);
    });

    it("past bookings: hasMore should be consistent with actual results", async () => {
      // Get all past bookings first to know the total
      const all = await getBookings({
        user: { id: teamXAdmin.id, email: teamXAdmin.email, orgId: null },
        prisma,
        kysely,
        bookingListingByStatus: ["past"],
        filters: {},
        take: 200,
        skip: 0,
      });

      expect(all.bookings.length).toBeGreaterThan(0);
      expect(all.hasMore).toBe(false);

      // Now fetch with take=1 — should have hasMore if there's more than 1
      if (all.bookings.length > 1) {
        const page1 = await getBookings({
          user: { id: teamXAdmin.id, email: teamXAdmin.email, orgId: null },
          prisma,
          kysely,
          bookingListingByStatus: ["past"],
          filters: {},
          take: 1,
          skip: 0,
        });

        expect(page1.bookings).toHaveLength(1);
        expect(page1.hasMore).toBe(true);
      }
    });
  });
});
