import { randomUUID } from "node:crypto";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { getDateRanges, getTimeView } from "@calcom/features/insights/server/insightsDateUtils";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  bookingStatsResultSchema,
  eventTrendsItemSchema,
  InsightsBookingBaseService as InsightsBookingService,
  type InsightsBookingServicePublicOptions,
  recentNoShowGuestSchema,
} from "./InsightsBookingBaseService";

/**
 * Creates test data for org-scope booking stats tests.
 *
 * Structure:
 *   org
 *   ├── team1 (user1 = OWNER)
 *   └── team2 (user2 = MEMBER)
 *
 * Bookings in BookingDenormalized:
 *   - 3 team bookings on team1 (2 completed, 1 cancelled)
 *   - 1 personal booking for user1
 *   - 1 team booking on team2 (completed, with noShowHost)
 *
 * Attendees:
 *   - booking1: 2 attendees (1 no-show)
 *   - booking2: 1 attendee (no-show)
 *   - booking5: 1 attendee (no-show)
 */
async function createStatsTestData() {
  const suffix = randomUUID();

  const user1 = await prisma.user.create({
    data: {
      email: `stats-user1-${suffix}@example.com`,
      username: `stats-user1-${suffix}`,
      name: "Stats User 1",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: `stats-user2-${suffix}@example.com`,
      username: `stats-user2-${suffix}`,
      name: "Stats User 2",
    },
  });

  const org = await prisma.team.create({
    data: {
      name: `Stats Org ${suffix}`,
      slug: `stats-org-${suffix}`,
      isOrganization: true,
    },
  });

  const team1 = await prisma.team.create({
    data: {
      name: `Stats Team 1 ${suffix}`,
      slug: `stats-team1-${suffix}`,
      parentId: org.id,
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: `Stats Team 2 ${suffix}`,
      slug: `stats-team2-${suffix}`,
      parentId: org.id,
    },
  });

  // Memberships
  const memberships = await Promise.all([
    prisma.membership.create({
      data: { userId: user1.id, teamId: org.id, role: MembershipRole.OWNER, accepted: true },
    }),
    prisma.membership.create({
      data: { userId: user1.id, teamId: team1.id, role: MembershipRole.OWNER, accepted: true },
    }),
    prisma.membership.create({
      data: { userId: user2.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    }),
    prisma.membership.create({
      data: { userId: user2.id, teamId: team2.id, role: MembershipRole.MEMBER, accepted: true },
    }),
  ]);

  // Fixed dates within a known range for deterministic tests
  const startDate = "2026-03-14T00:00:00.000Z";
  const endDate = "2026-03-16T23:59:59.999Z";

  // Create event types for team and personal bookings.
  // The denormalization trigger derives teamId/isTeamBooking from EventType.
  const teamEventType1 = await prisma.eventType.create({
    data: { title: "Team Event 1", slug: `team-event-1-${suffix}`, length: 60, teamId: team1.id },
  });
  const teamEventType2 = await prisma.eventType.create({
    data: { title: "Team Event 2", slug: `team-event-2-${suffix}`, length: 60, teamId: team2.id },
  });
  const personalEventType = await prisma.eventType.create({
    data: { title: "Personal Event", slug: `personal-event-${suffix}`, length: 60, userId: user1.id },
  });

  // Create real Booking records. The trigger populates BookingDenormalized automatically.
  // booking1: team1, accepted
  const b1 = await prisma.booking.create({
    data: {
      uid: `stats-b1-${suffix}`,
      title: "Team Booking 1",
      startTime: new Date("2026-03-15T10:00:00.000Z"),
      endTime: new Date("2026-03-15T11:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.ACCEPTED,
      createdAt: new Date("2026-03-15T09:00:00.000Z"),
    },
  });

  // booking2: team1, accepted
  const b2 = await prisma.booking.create({
    data: {
      uid: `stats-b2-${suffix}`,
      title: "Team Booking 2",
      startTime: new Date("2026-03-15T12:00:00.000Z"),
      endTime: new Date("2026-03-15T13:00:00.000Z"),
      createdAt: new Date("2026-03-15T11:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.ACCEPTED,
    },
  });

  // booking3: team1, cancelled
  const b3 = await prisma.booking.create({
    data: {
      uid: `stats-b3-${suffix}`,
      title: "Cancelled Booking",
      startTime: new Date("2026-03-15T14:00:00.000Z"),
      endTime: new Date("2026-03-15T15:00:00.000Z"),
      createdAt: new Date("2026-03-15T13:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.CANCELLED,
    },
  });

  // booking4: personal booking for user1 (no team), with rating
  const b4 = await prisma.booking.create({
    data: {
      uid: `stats-b4-${suffix}`,
      title: "Personal Booking",
      startTime: new Date("2026-03-15T16:00:00.000Z"),
      endTime: new Date("2026-03-15T17:00:00.000Z"),
      createdAt: new Date("2026-03-15T15:00:00.000Z"),
      userId: user1.id,
      eventTypeId: personalEventType.id,
      status: BookingStatus.ACCEPTED,
      rating: 4,
    },
  });

  // booking5: team2, accepted, noShowHost = true
  const b5 = await prisma.booking.create({
    data: {
      uid: `stats-b5-${suffix}`,
      title: "NoShow Booking",
      startTime: new Date("2026-03-15T18:00:00.000Z"),
      endTime: new Date("2026-03-15T19:00:00.000Z"),
      createdAt: new Date("2026-03-15T17:00:00.000Z"),
      userId: user2.id,
      eventTypeId: teamEventType2.id,
      status: BookingStatus.ACCEPTED,
      noShowHost: true,
    },
  });

  const [b1Id, b2Id, b3Id, b4Id, b5Id] = [b1.id, b2.id, b3.id, b4.id, b5.id];
  const bookingIds = [b1Id, b2Id, b3Id, b4Id, b5Id];
  const eventTypeIds = [teamEventType1.id, teamEventType2.id, personalEventType.id];

  // Remove any pre-existing attendees from simulation data that may share
  // these booking IDs (the Booking.id sequence can overlap with simulation attendees)
  await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });

  // Create Attendees with no-show flags
  // booking1: 2 attendees, 1 no-show
  const attendee1 = await prisma.attendee.create({
    data: { email: `att1-${suffix}@example.com`, name: "Att 1", timeZone: "UTC", bookingId: b1Id },
  });
  const attendee2 = await prisma.attendee.create({
    data: {
      email: `att2-${suffix}@example.com`,
      name: "Att 2",
      timeZone: "UTC",
      bookingId: b1Id,
      noShow: true,
    },
  });

  // booking2: 1 attendee, no-show
  const attendee3 = await prisma.attendee.create({
    data: {
      email: `att3-${suffix}@example.com`,
      name: "Att 3",
      timeZone: "UTC",
      bookingId: b2Id,
      noShow: true,
    },
  });

  // booking5: 1 attendee, no-show
  const attendee4 = await prisma.attendee.create({
    data: {
      email: `att4-${suffix}@example.com`,
      name: "Att 4",
      timeZone: "UTC",
      bookingId: b5Id,
      noShow: true,
    },
  });

  const attendeeIds = [attendee1.id, attendee2.id, attendee3.id, attendee4.id];

  return {
    user1,
    user2,
    org,
    team1,
    team2,
    memberships,
    bookingIds,
    attendeeIds,
    b1Id,
    b2Id,
    b3Id,
    b4Id,
    b5Id,
    startDate,
    endDate,
    eventTypeIds,
    cleanup: async () => {
      await prisma.attendee.deleteMany({ where: { id: { in: attendeeIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await prisma.eventType.deleteMany({ where: { id: { in: eventTypeIds } } });
      await prisma.membership.deleteMany({ where: { id: { in: memberships.map((m) => m.id) } } });
      await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id] } } });
      await prisma.team.delete({ where: { id: org.id } });
      await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
    },
  };
}

describe("InsightsBookingService Stats Integration Tests", () => {
  let testData: Awaited<ReturnType<typeof createStatsTestData>>;

  beforeAll(async () => {
    testData = await createStatsTestData();
  });

  afterAll(async () => {
    await testData.cleanup();
  });

  describe("getAuthorizationBranches", () => {
    it("should return null for user scope", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
      });
      const branches = await service.getAuthorizationBranches();
      expect(branches).toBeNull();
    });

    it("should return branches for org scope (owner)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
      });
      const branches = await service.getAuthorizationBranches();
      expect(branches).not.toBeNull();
      expect(branches!.length).toBe(2);
    });

    it("should return null for org scope (non-owner)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user2.id,
          orgId: testData.org.id,
        },
      });
      const branches = await service.getAuthorizationBranches();
      expect(branches).toBeNull();
    });

    it("should return null for team scope (non-owner member)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user2.id,
          orgId: testData.org.id,
          teamId: testData.team2.id,
        },
      });
      const branches = await service.getAuthorizationBranches();
      expect(branches).toBeNull();
    });

    it("should return branches for team scope (owner)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user1.id,
          orgId: testData.org.id,
          teamId: testData.team1.id,
        },
      });
      const branches = await service.getAuthorizationBranches();
      expect(branches).not.toBeNull();
      expect(branches!.length).toBe(2);
    });
  });

  describe("getBookingStats", () => {
    it("should return correct KPIs for org scope (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const stats = await service.getBookingStats();

      // 5 total bookings (3 team1 + 1 personal + 1 team2)
      expect(stats.total_bookings).toBe(5);

      // cancelled: booking3
      expect(stats.cancelled_bookings).toBe(1);

      // noShowHost: booking5
      expect(stats.no_show_host_bookings).toBe(1);

      // no-show guests: attendee2 (b1) + attendee3 (b2) + attendee4 (b5) = 3
      expect(stats.no_show_guests).toBe(3);

      // rating: only booking4 has rating=4
      expect(Number(stats.avg_rating)).toBe(4);
      expect(stats.total_ratings).toBe(1);
      expect(stats.ratings_above_3).toBe(1);
    });

    it("should return correct KPIs for team scope (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user1.id,
          orgId: testData.org.id,
          teamId: testData.team1.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const stats = await service.getBookingStats();

      // team1 has 3 team bookings + user1 has 1 personal booking = 4
      expect(stats.total_bookings).toBe(4);
      expect(stats.cancelled_bookings).toBe(1);
      expect(stats.no_show_host_bookings).toBe(0);
      // no-show guests from team1 bookings: att2 (b1) + att3 (b2) = 2
      expect(stats.no_show_guests).toBe(2);
    });

    it("should return correct KPIs for user scope (single-query path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const stats = await service.getBookingStats();

      // User scope: only personal bookings (isTeamBooking = false, teamId IS NULL)
      // booking4 is the only personal booking for user1
      expect(stats.total_bookings).toBe(1);
      expect(Number(stats.avg_rating)).toBe(4);
    });
  });

  describe("getEventTrendsStats", () => {
    it("should return correct trends for org scope (UNION ALL path)", async () => {
      const timeZone = "UTC";
      const timeView = getTimeView(testData.startDate, testData.endDate);
      const dateRanges = getDateRanges({
        startDate: testData.startDate,
        endDate: testData.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const trends = await service.getEventTrendsStats({
        timeZone,
        dateRanges,
      });

      // All bookings have createdAt on 2026-03-15 UTC
      // Find the date range that includes March 15
      const march15Range = trends.find((t) => {
        return t.Created > 0;
      });

      expect(march15Range).toBeDefined();
      expect(march15Range!.Created).toBe(5);
      expect(march15Range!.Cancelled).toBe(1);
      expect(march15Range!["No-Show (Host)"]).toBe(1);
      expect(march15Range!["No-Show (Guest)"]).toBe(3);
    });

    it("should return correct trends for user scope (single-query path)", async () => {
      const timeZone = "UTC";
      const timeView = getTimeView(testData.startDate, testData.endDate);
      const dateRanges = getDateRanges({
        startDate: testData.startDate,
        endDate: testData.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const trends = await service.getEventTrendsStats({
        timeZone,
        dateRanges,
      });

      const activeRange = trends.find((t) => t.Created > 0);
      expect(activeRange).toBeDefined();
      // Only personal booking4 for user scope
      expect(activeRange!.Created).toBe(1);
    });

    it("should return empty results when no bookings match date range", async () => {
      const timeZone = "UTC";
      const farFutureStart = "2030-01-01T00:00:00.000Z";
      const farFutureEnd = "2030-01-07T23:59:59.999Z";
      const timeView = getTimeView(farFutureStart, farFutureEnd);
      const dateRanges = getDateRanges({
        startDate: farFutureStart,
        endDate: farFutureEnd,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: farFutureStart, endDate: farFutureEnd, preset: "custom" },
              },
            },
          ],
        },
      });

      const trends = await service.getEventTrendsStats({
        timeZone,
        dateRanges,
      });

      // All ranges should have zero counts
      for (const t of trends) {
        expect(t.Created).toBe(0);
        expect(t.Completed).toBe(0);
        expect(t.Cancelled).toBe(0);
        expect(t["No-Show (Host)"]).toBe(0);
        expect(t["No-Show (Guest)"]).toBe(0);
      }
    });
  });

  describe("getEventTrendsStats (team scope)", () => {
    it("should return correct trends for team scope (UNION ALL path)", async () => {
      const timeZone = "UTC";
      const timeView = getTimeView(testData.startDate, testData.endDate);
      const dateRanges = getDateRanges({
        startDate: testData.startDate,
        endDate: testData.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user1.id,
          orgId: testData.org.id,
          teamId: testData.team1.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const trends = await service.getEventTrendsStats({ timeZone, dateRanges });

      const activeRange = trends.find((t) => t.Created > 0);
      expect(activeRange).toBeDefined();
      // team1: 3 team bookings + 1 personal booking for user1 = 4
      expect(activeRange!.Created).toBe(4);
      expect(activeRange!.Cancelled).toBe(1);
      expect(activeRange!["No-Show (Host)"]).toBe(0);
      // no-show guests: att2 (b1) + att3 (b2) = 2
      expect(activeRange!["No-Show (Guest)"]).toBe(2);
    });
  });

  describe("getBookingStats (zero results)", () => {
    it("should return all zeros when no bookings match", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: "2030-01-01T00:00:00.000Z",
                  endDate: "2030-01-07T23:59:59.999Z",
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const stats = await service.getBookingStats();
      expect(stats.total_bookings).toBe(0);
      expect(stats.completed_bookings).toBe(0);
      expect(stats.cancelled_bookings).toBe(0);
      expect(stats.no_show_guests).toBe(0);
    });
  });

  describe("getBookingStats with filters + UNION ALL", () => {
    it("should apply userId filter on top of UNION ALL branches", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
            {
              id: "userId",
              value: {
                type: ColumnFilterType.SINGLE_SELECT,
                data: testData.user2.id,
              },
            },
          ],
        },
      });

      const stats = await service.getBookingStats();
      // user2 only has booking5 (team2, noShowHost)
      expect(stats.total_bookings).toBe(1);
      expect(stats.no_show_host_bookings).toBe(1);
    });
  });

  describe("getRecentNoShowGuests ordering", () => {
    it("should return results ordered by startTime DESC", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const results = await service.getRecentNoShowGuests();
      // b5 (18:00) should come before b2 (12:00) in DESC order
      if (results.length === 2) {
        expect(results[0].bookingId).toBe(testData.b5Id);
        expect(results[1].bookingId).toBe(testData.b2Id);
      }
    });
  });

  describe("getBookingStats with getEventTrendsStats consistency", () => {
    it("should have consistent total counts between KPI and trends", async () => {
      const timeZone = "UTC";
      const timeView = getTimeView(testData.startDate, testData.endDate);
      const dateRanges = getDateRanges({
        startDate: testData.startDate,
        endDate: testData.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const filters = {
        columnFilters: [
          {
            id: "startTime" as const,
            value: {
              type: ColumnFilterType.DATE_RANGE as const,
              data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
            },
          },
        ],
      };

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters,
      });

      const stats = await service.getBookingStats();
      const trends = await service.getEventTrendsStats({ timeZone, dateRanges });

      const totalCreated = trends.reduce((sum, t) => sum + t.Created, 0);
      const totalCancelled = trends.reduce((sum, t) => sum + t.Cancelled, 0);
      const totalNoShowGuest = trends.reduce((sum, t) => sum + t["No-Show (Guest)"], 0);

      expect(totalCreated).toBe(stats.total_bookings);
      expect(totalCancelled).toBe(stats.cancelled_bookings);
      expect(totalNoShowGuest).toBe(stats.no_show_guests);
    });
  });

  describe("getRecentNoShowGuests", () => {
    it("should return bookings where ALL attendees are no-shows for org scope (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const results = await service.getRecentNoShowGuests();

      // b2: 1 attendee (all no-show) → included
      // b5: 1 attendee (all no-show) → included
      // b1: 2 attendees, only 1 no-show → excluded
      // b3: cancelled → excluded (status != accepted)
      // b4: no attendees → excluded
      expect(results.length).toBe(2);

      const bookingIds = results.map((r) => r.bookingId).sort((a, b) => a - b);
      expect(bookingIds).toEqual([testData.b2Id, testData.b5Id].sort((a, b) => a - b));
    });

    it("should return bookings where ALL attendees are no-shows for team scope (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user1.id,
          orgId: testData.org.id,
          teamId: testData.team1.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const results = await service.getRecentNoShowGuests();

      // team1 scope: b2 (all no-show) + user1 personal bookings
      // b2: 1 attendee, all no-show → included
      // b1: 2 attendees, only 1 no-show → excluded
      // b4: personal, no attendees → excluded
      expect(results.length).toBe(1);
      expect(results[0].bookingId).toBe(testData.b2Id);
    });

    it("should return empty for user scope when no all-noshow bookings (single-query path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user1.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
              },
            },
          ],
        },
      });

      const results = await service.getRecentNoShowGuests();

      // User scope: only personal bookings (teamId IS NULL, isTeamBooking = false)
      // b4: personal booking, no attendees → excluded
      expect(results.length).toBe(0);
    });
  });

  describe("result schema validation", () => {
    function makeFilters() {
      return {
        columnFilters: [
          {
            id: "startTime" as const,
            value: {
              type: ColumnFilterType.DATE_RANGE as const,
              data: { startDate: testData.startDate, endDate: testData.endDate, preset: "custom" },
            },
          },
        ],
      };
    }

    it("getBookingStats result matches schema (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: { scope: "org", userId: testData.user1.id, orgId: testData.org.id },
        filters: makeFilters(),
      });

      const stats = await service.getBookingStats();
      expect(() => bookingStatsResultSchema.parse(stats)).not.toThrow();
    });

    it("getBookingStats result matches schema (single-query path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: { scope: "user", userId: testData.user1.id, orgId: testData.org.id },
        filters: makeFilters(),
      });

      const stats = await service.getBookingStats();
      expect(() => bookingStatsResultSchema.parse(stats)).not.toThrow();
    });

    it("getEventTrendsStats result matches schema (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: { scope: "org", userId: testData.user1.id, orgId: testData.org.id },
        filters: makeFilters(),
      });

      const timeZone = "UTC";
      const timeView = getTimeView(testData.startDate, testData.endDate);
      const dateRanges = getDateRanges({
        startDate: testData.startDate,
        endDate: testData.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const trends = await service.getEventTrendsStats({ timeZone, dateRanges });
      expect(() => z.array(eventTrendsItemSchema).parse(trends)).not.toThrow();
      expect(trends.length).toBeGreaterThan(0);
    });

    it("getRecentNoShowGuests result matches schema (UNION ALL path)", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: { scope: "org", userId: testData.user1.id, orgId: testData.org.id },
        filters: makeFilters(),
      });

      const results = await service.getRecentNoShowGuests();
      expect(() => z.array(recentNoShowGuestSchema).parse(results)).not.toThrow();
    });
  });
});
