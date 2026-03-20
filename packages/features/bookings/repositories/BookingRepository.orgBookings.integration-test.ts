import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { BookingRepository } from "./BookingRepository";

const uniqueSuffix = `org-booking-test-${Date.now()}`;

let orgId: number;
let childTeamId: number;
let orgUserId: number;
let nonOrgUserId: number;
let orgTeamEventTypeId: number;
let orgUserEventTypeId: number;
let nonOrgEventTypeId: number;

const createdBookingIds: number[] = [];
const createdReportIds: string[] = [];

async function cleanup() {
  if (createdReportIds.length > 0) {
    await prisma.bookingReport.deleteMany({
      where: { id: { in: createdReportIds } },
    });
    createdReportIds.length = 0;
  }
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

async function createBookingWithAttendee({
  userId,
  eventTypeId,
  attendeeEmail,
  startTime,
  status = BookingStatus.ACCEPTED,
  uid,
}: {
  userId: number;
  eventTypeId: number;
  attendeeEmail: string;
  startTime: Date;
  status?: BookingStatus;
  uid?: string;
}) {
  const booking = await prisma.booking.create({
    data: {
      uid: uid || `${uniqueSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "Test Booking",
      startTime,
      endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
      userId,
      eventTypeId,
      status,
      attendees: {
        create: {
          email: attendeeEmail,
          name: "Test Attendee",
          timeZone: "UTC",
        },
      },
    },
  });
  createdBookingIds.push(booking.id);
  return booking;
}

describe("BookingRepository - Org Booking Queries", () => {
  const repo = new BookingRepository(prisma);

  beforeAll(async () => {
    // Create organization
    const org = await prisma.team.create({
      data: {
        name: `Test Org ${uniqueSuffix}`,
        slug: `test-org-${uniqueSuffix}`,
        isOrganization: true,
      },
    });
    orgId = org.id;

    // Create child team under org
    const childTeam = await prisma.team.create({
      data: {
        name: `Test Team ${uniqueSuffix}`,
        slug: `test-team-${uniqueSuffix}`,
        parentId: orgId,
      },
    });
    childTeamId = childTeam.id;

    // Create org user (with profile)
    const orgUser = await prisma.user.create({
      data: {
        email: `org-user-${uniqueSuffix}@example.com`,
        username: `org-user-${uniqueSuffix}`,
      },
    });
    orgUserId = orgUser.id;

    await prisma.profile.create({
      data: {
        uid: `profile-${uniqueSuffix}`,
        userId: orgUserId,
        organizationId: orgId,
        username: `org-user-${uniqueSuffix}`,
      },
    });

    // Create non-org user
    const nonOrgUser = await prisma.user.create({
      data: {
        email: `non-org-user-${uniqueSuffix}@example.com`,
        username: `non-org-user-${uniqueSuffix}`,
      },
    });
    nonOrgUserId = nonOrgUser.id;

    // Create event type for child team (team-based org membership)
    const teamEventType = await prisma.eventType.create({
      data: {
        title: "Team Event",
        slug: `team-event-${uniqueSuffix}`,
        length: 30,
        teamId: childTeamId,
      },
    });
    orgTeamEventTypeId = teamEventType.id;

    // Create event type for org user (profile-based org membership)
    const userEventType = await prisma.eventType.create({
      data: {
        title: "User Event",
        slug: `user-event-${uniqueSuffix}`,
        length: 30,
        userId: orgUserId,
      },
    });
    orgUserEventTypeId = userEventType.id;

    // Create event type for non-org user
    const nonOrgEventType = await prisma.eventType.create({
      data: {
        title: "Non-Org Event",
        slug: `non-org-event-${uniqueSuffix}`,
        length: 30,
        userId: nonOrgUserId,
      },
    });
    nonOrgEventTypeId = nonOrgEventType.id;
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();

    // Tear down in reverse order of creation
    await prisma.eventType.deleteMany({
      where: { id: { in: [orgTeamEventTypeId, orgUserEventTypeId, nonOrgEventTypeId] } },
    });
    await prisma.profile.deleteMany({ where: { userId: orgUserId } });
    await prisma.user.deleteMany({ where: { id: { in: [orgUserId, nonOrgUserId] } } });
    await prisma.team.deleteMany({ where: { id: childTeamId } });
    await prisma.team.deleteMany({ where: { id: orgId } });
  });

  describe("findUpcomingUnreportedOrgBookingsByEmail", () => {
    it("finds upcoming bookings via child team membership", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(1);
      expect(results[0].attendees[0].email).toBe("spammer@evil.com");
    });

    it("finds upcoming bookings via user profile org membership", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgUserEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(1);
      expect(results[0].attendees[0].email).toBe("spammer@evil.com");
    });

    it("excludes bookings from non-org users/teams", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: nonOrgUserId,
        eventTypeId: nonOrgEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("excludes past bookings", async () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: pastDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("excludes already-reported bookings", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const booking = await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate,
      });

      const report = await prisma.bookingReport.create({
        data: {
          bookingUid: booking.uid,
          bookerEmail: "spammer@evil.com",
          reason: "SPAM",
          organizationId: orgId,
        },
      });
      createdReportIds.push(report.id);

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("excludes cancelled/rejected bookings", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate,
        status: BookingStatus.CANCELLED,
      });
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
        status: BookingStatus.REJECTED,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("does not match bookings with different attendee emails", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "legitimate@good.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("returns bookings ordered by startTime ascending", async () => {
      const futureDate1 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const futureDate2 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate1,
      });
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "spammer@evil.com",
        startTime: futureDate2,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
        email: "spammer@evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(2);
      expect(results[0].startTime.getTime()).toBeLessThan(results[1].startTime.getTime());
    });

    it("finds bookings on direct org team (not just child teams)", async () => {
      // Event type directly on the org team
      const orgDirectEventType = await prisma.eventType.create({
        data: {
          title: "Org Direct Event",
          slug: `org-direct-event-${uniqueSuffix}`,
          length: 30,
          teamId: orgId,
        },
      });

      try {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await createBookingWithAttendee({
          userId: orgUserId,
          eventTypeId: orgDirectEventType.id,
          attendeeEmail: "spammer@evil.com",
          startTime: futureDate,
        });

        const results = await repo.findUpcomingUnreportedOrgBookingsByEmail({
          email: "spammer@evil.com",
          organizationId: orgId,
        });

        expect(results).toHaveLength(1);
      } finally {
        await prisma.eventType.delete({ where: { id: orgDirectEventType.id } });
      }
    });
  });

  describe("findUpcomingUnreportedOrgBookingsByDomain", () => {
    it("matches all attendees with the given domain", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "alice@evil.com",
        startTime: futureDate,
      });
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "bob@evil.com",
        startTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByDomain({
        domain: "evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(2);
      const emails = results.map((r) => r.attendees[0].email);
      expect(emails).toContain("alice@evil.com");
      expect(emails).toContain("bob@evil.com");
    });

    it("does not match attendees from different domains", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "user@good.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByDomain({
        domain: "evil.com",
        organizationId: orgId,
      });

      expect(results).toHaveLength(0);
    });

    it("does not false-match domains that are substrings (e.g., evil.com vs notevil.com)", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "user@notevil.com",
        startTime: futureDate,
      });

      const results = await repo.findUpcomingUnreportedOrgBookingsByDomain({
        domain: "evil.com",
        organizationId: orgId,
      });

      // "user@notevil.com" ends with "@evil.com"? No, the LIKE pattern is %@evil.com
      // so "user@notevil.com" would NOT match because the @ is part of the pattern
      expect(results).toHaveLength(0);
    });
  });

  describe("findByUidIncludeReportAndEventType", () => {
    it("returns booking with report, event type, and user profiles", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const bookingUid = `${uniqueSuffix}-findbyuid-test`;
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "attendee@example.com",
        startTime: futureDate,
        uid: bookingUid,
      });

      const result = await repo.findByUidIncludeReportAndEventType({ bookingUid });

      expect(result).not.toBeNull();
      expect(result!.uid).toBe(bookingUid);
      expect(result!.attendees).toHaveLength(1);
      expect(result!.attendees[0].email).toBe("attendee@example.com");
      expect(result!.report).toBeNull();
      expect(result!.eventType).not.toBeNull();
      expect(result!.eventType!.team).not.toBeNull();
      expect(result!.eventType!.team!.parentId).toBe(orgId);
      expect(result!.user!.profiles).toBeDefined();
    });

    it("returns report when booking has one", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const bookingUid = `${uniqueSuffix}-reported-test`;
      await createBookingWithAttendee({
        userId: orgUserId,
        eventTypeId: orgTeamEventTypeId,
        attendeeEmail: "attendee@example.com",
        startTime: futureDate,
        uid: bookingUid,
      });

      const report = await prisma.bookingReport.create({
        data: {
          bookingUid,
          bookerEmail: "attendee@example.com",
          reason: "SPAM",
          organizationId: orgId,
        },
      });
      createdReportIds.push(report.id);

      const result = await repo.findByUidIncludeReportAndEventType({ bookingUid });

      expect(result).not.toBeNull();
      expect(result!.report).not.toBeNull();
      expect(result!.report!.id).toBe(report.id);
    });

    it("returns null for non-existent booking", async () => {
      const result = await repo.findByUidIncludeReportAndEventType({
        bookingUid: "nonexistent-uid-12345",
      });

      expect(result).toBeNull();
    });
  });
});
