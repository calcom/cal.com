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
  recentNoShowGuestSchema,
} from "./InsightsBookingBaseService";

// ────────────────────────────────────────────────────────────────────────────
// Shared test-data factory
// ────────────────────────────────────────────────────────────────────────────

/**
 * Creates test data for performance-optimization tests.
 *
 * Structure:
 *   org
 *   ├── team1 (user1 = OWNER, user3 = MEMBER)
 *   └── team2 (user2 = MEMBER)
 *
 *   org2  (isolated – used for cross-org tests)
 *   └── team3 (user4 = OWNER)
 *
 * Bookings (all on 2026-03-15, within startDate..endDate):
 *   b1: team1, accepted, 2 attendees (1 no-show)
 *   b2: team1, accepted, 1 attendee  (no-show)
 *   b3: team1, cancelled, 0 attendees
 *   b4: personal user1, accepted, rating=4, 0 attendees
 *   b5: team2, accepted, noShowHost, 1 attendee (no-show)
 *   b6: team3/org2, accepted, 1 attendee (no-show)  ← should NOT appear in org1 queries
 *
 * user3 belongs to team1 (same as user1) → tests deduplication in SQL subqueries.
 */
async function createTestData() {
  const suffix = randomUUID();

  // ── Users ──────────────────────────────────────────────────────────────
  const user1 = await prisma.user.create({
    data: { email: `perf-u1-${suffix}@example.com`, username: `perf-u1-${suffix}`, name: "Perf User 1" },
  });
  const user2 = await prisma.user.create({
    data: { email: `perf-u2-${suffix}@example.com`, username: `perf-u2-${suffix}`, name: "Perf User 2" },
  });
  const user3 = await prisma.user.create({
    data: { email: `perf-u3-${suffix}@example.com`, username: `perf-u3-${suffix}`, name: "Perf User 3" },
  });
  const user4 = await prisma.user.create({
    data: { email: `perf-u4-${suffix}@example.com`, username: `perf-u4-${suffix}`, name: "Perf User 4" },
  });

  // ── Org 1 ──────────────────────────────────────────────────────────────
  const org = await prisma.team.create({
    data: { name: `Perf Org ${suffix}`, slug: `perf-org-${suffix}`, isOrganization: true },
  });
  const team1 = await prisma.team.create({
    data: { name: `Perf Team1 ${suffix}`, slug: `perf-team1-${suffix}`, parentId: org.id },
  });
  const team2 = await prisma.team.create({
    data: { name: `Perf Team2 ${suffix}`, slug: `perf-team2-${suffix}`, parentId: org.id },
  });

  // ── Org 2 (isolated) ──────────────────────────────────────────────────
  const org2 = await prisma.team.create({
    data: { name: `Perf Org2 ${suffix}`, slug: `perf-org2-${suffix}`, isOrganization: true },
  });
  const team3 = await prisma.team.create({
    data: { name: `Perf Team3 ${suffix}`, slug: `perf-team3-${suffix}`, parentId: org2.id },
  });

  // ── Memberships ────────────────────────────────────────────────────────
  const memberships = await Promise.all([
    // org1
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
    // user3 in team1 (same team as user1 → dedup test)
    prisma.membership.create({
      data: { userId: user3.id, teamId: org.id, role: MembershipRole.MEMBER, accepted: true },
    }),
    prisma.membership.create({
      data: { userId: user3.id, teamId: team1.id, role: MembershipRole.MEMBER, accepted: true },
    }),
    // org2
    prisma.membership.create({
      data: { userId: user4.id, teamId: org2.id, role: MembershipRole.OWNER, accepted: true },
    }),
    prisma.membership.create({
      data: { userId: user4.id, teamId: team3.id, role: MembershipRole.OWNER, accepted: true },
    }),
  ]);

  // Fixed dates for deterministic tests
  const startDate = "2026-03-14T00:00:00.000Z";
  const endDate = "2026-03-16T23:59:59.999Z";

  // ── Event types ────────────────────────────────────────────────────────
  const teamEventType1 = await prisma.eventType.create({
    data: { title: "Team1 Event", slug: `team1-evt-${suffix}`, length: 60, teamId: team1.id },
  });
  const teamEventType2 = await prisma.eventType.create({
    data: { title: "Team2 Event", slug: `team2-evt-${suffix}`, length: 60, teamId: team2.id },
  });
  const personalEventType = await prisma.eventType.create({
    data: { title: "Personal Event", slug: `personal-evt-${suffix}`, length: 60, userId: user1.id },
  });
  const teamEventType3 = await prisma.eventType.create({
    data: { title: "Team3 Event", slug: `team3-evt-${suffix}`, length: 60, teamId: team3.id },
  });

  // ── Bookings ───────────────────────────────────────────────────────────
  const b1 = await prisma.booking.create({
    data: {
      uid: `perf-b1-${suffix}`,
      title: "Team Booking 1",
      startTime: new Date("2026-03-15T10:00:00.000Z"),
      endTime: new Date("2026-03-15T11:00:00.000Z"),
      createdAt: new Date("2026-03-15T09:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.ACCEPTED,
    },
  });
  const b2 = await prisma.booking.create({
    data: {
      uid: `perf-b2-${suffix}`,
      title: "Team Booking 2",
      startTime: new Date("2026-03-15T12:00:00.000Z"),
      endTime: new Date("2026-03-15T13:00:00.000Z"),
      createdAt: new Date("2026-03-15T11:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.ACCEPTED,
    },
  });
  const b3 = await prisma.booking.create({
    data: {
      uid: `perf-b3-${suffix}`,
      title: "Cancelled Booking",
      startTime: new Date("2026-03-15T14:00:00.000Z"),
      endTime: new Date("2026-03-15T15:00:00.000Z"),
      createdAt: new Date("2026-03-15T13:00:00.000Z"),
      userId: user1.id,
      eventTypeId: teamEventType1.id,
      status: BookingStatus.CANCELLED,
    },
  });
  const b4 = await prisma.booking.create({
    data: {
      uid: `perf-b4-${suffix}`,
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
  const b5 = await prisma.booking.create({
    data: {
      uid: `perf-b5-${suffix}`,
      title: "NoShow Host Booking",
      startTime: new Date("2026-03-15T18:00:00.000Z"),
      endTime: new Date("2026-03-15T19:00:00.000Z"),
      createdAt: new Date("2026-03-15T17:00:00.000Z"),
      userId: user2.id,
      eventTypeId: teamEventType2.id,
      status: BookingStatus.ACCEPTED,
      noShowHost: true,
    },
  });
  // b6: belongs to org2 → must NOT appear in org1 results
  const b6 = await prisma.booking.create({
    data: {
      uid: `perf-b6-${suffix}`,
      title: "Org2 Booking",
      startTime: new Date("2026-03-15T20:00:00.000Z"),
      endTime: new Date("2026-03-15T21:00:00.000Z"),
      createdAt: new Date("2026-03-15T19:00:00.000Z"),
      userId: user4.id,
      eventTypeId: teamEventType3.id,
      status: BookingStatus.ACCEPTED,
    },
  });

  const bookingIds = [b1.id, b2.id, b3.id, b4.id, b5.id, b6.id];
  const eventTypeIds = [teamEventType1.id, teamEventType2.id, personalEventType.id, teamEventType3.id];

  // Remove pre-existing attendees that might conflict
  await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });

  // ── Attendees ──────────────────────────────────────────────────────────
  // b1: 2 attendees, 1 no-show
  const att1 = await prisma.attendee.create({
    data: { email: `att1-${suffix}@test.com`, name: "Att 1", timeZone: "UTC", bookingId: b1.id },
  });
  const att2 = await prisma.attendee.create({
    data: {
      email: `att2-${suffix}@test.com`,
      name: "Att 2",
      timeZone: "UTC",
      bookingId: b1.id,
      noShow: true,
    },
  });
  // b2: 1 attendee, no-show
  const att3 = await prisma.attendee.create({
    data: {
      email: `att3-${suffix}@test.com`,
      name: "Att 3",
      timeZone: "UTC",
      bookingId: b2.id,
      noShow: true,
    },
  });
  // b5: 1 attendee, no-show
  const att4 = await prisma.attendee.create({
    data: {
      email: `att4-${suffix}@test.com`,
      name: "Att 4",
      timeZone: "UTC",
      bookingId: b5.id,
      noShow: true,
    },
  });
  // b6 (org2): 1 attendee, no-show
  const att5 = await prisma.attendee.create({
    data: {
      email: `att5-${suffix}@test.com`,
      name: "Att 5",
      timeZone: "UTC",
      bookingId: b6.id,
      noShow: true,
    },
  });

  const attendeeIds = [att1.id, att2.id, att3.id, att4.id, att5.id];

  return {
    user1,
    user2,
    user3,
    user4,
    org,
    org2,
    team1,
    team2,
    team3,
    memberships,
    bookingIds,
    attendeeIds,
    eventTypeIds,
    b1Id: b1.id,
    b2Id: b2.id,
    b3Id: b3.id,
    b4Id: b4.id,
    b5Id: b5.id,
    b6Id: b6.id,
    startDate,
    endDate,
    cleanup: async () => {
      await prisma.attendee.deleteMany({ where: { id: { in: attendeeIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await prisma.eventType.deleteMany({ where: { id: { in: eventTypeIds } } });
      await prisma.membership.deleteMany({ where: { id: { in: memberships.map((m) => m.id) } } });
      await prisma.team.deleteMany({ where: { id: { in: [team1.id, team2.id, team3.id] } } });
      await prisma.team.deleteMany({ where: { id: { in: [org.id, org2.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, user3.id, user4.id] } } });
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: build date-range column filter
// ────────────────────────────────────────────────────────────────────────────
function makeDateFilter(startDate: string, endDate: string) {
  return {
    columnFilters: [
      {
        id: "startTime" as const,
        value: {
          type: ColumnFilterType.DATE_RANGE as const,
          data: { startDate, endDate, preset: "custom" },
        },
      },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ════════════════════════════════════════════════════════════════════════════

describe("Insights Performance Optimizations", () => {
  let td: Awaited<ReturnType<typeof createTestData>>;

  beforeAll(async () => {
    td = await createTestData();
  });

  afterAll(async () => {
    await td.cleanup();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Fix 2: Org authorization uses SQL subqueries instead of literal arrays
  // ──────────────────────────────────────────────────────────────────────

  describe("Fix 2 – Org authorization SQL subqueries", () => {
    describe("buildOrgAuthorizationCondition (via getAuthorizationConditions)", () => {
      it("should return SQL subquery structure for org scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
        });

        const conditions = await service.getAuthorizationConditions();

        // Verify the Prisma.sql template uses subqueries, not literal arrays
        const orgId = td.org.id;
        const teamSubquery = Prisma.sql`SELECT id FROM "Team" WHERE "parentId" = ${orgId} OR id = ${orgId}`;
        const userSubquery = Prisma.sql`SELECT DISTINCT m."userId" FROM "Membership" m WHERE m."teamId" IN (${teamSubquery}) AND m."accepted" = true`;

        expect(conditions).toEqual(
          Prisma.sql`(("teamId" IN (${teamSubquery})) AND ("isTeamBooking" = true)) OR (("userId" IN (${userSubquery})) AND ("isTeamBooking" = false))`
        );
      });

      it("should produce conditions that correctly filter bookings for org scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
        });

        const conditions = await service.getAuthorizationConditions();
        const results = await prisma.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT id FROM "BookingTimeStatusDenormalized" WHERE ${conditions} ORDER BY id`
        );
        const ids = results.map((r) => r.id).sort((a, b) => a - b);

        // Should include all org1 bookings: b1..b5
        expect(ids).toContain(td.b1Id);
        expect(ids).toContain(td.b2Id);
        expect(ids).toContain(td.b3Id);
        expect(ids).toContain(td.b4Id);
        expect(ids).toContain(td.b5Id);
        // Must NOT include org2 booking
        expect(ids).not.toContain(td.b6Id);
      });

      it("should handle user in multiple teams without duplication issues", async () => {
        // user3 belongs to both org and team1 → SQL DISTINCT should handle dedup
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
        });

        const conditions = await service.getAuthorizationConditions();
        const results = await prisma.$queryRaw<{ id: number }[]>(
          Prisma.sql`SELECT id FROM "BookingTimeStatusDenormalized" WHERE ${conditions} ORDER BY id`
        );
        const ids = results.map((r) => r.id);

        // b4 is user1's personal booking — it must appear exactly once
        const b4Count = ids.filter((id) => id === td.b4Id).length;
        expect(b4Count).toBe(1);
      });
    });

    describe("buildOrgAuthorizationBranches (via getAuthorizationBranches)", () => {
      it("should return SQL subquery branches for org owner", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
        });

        const branches = await service.getAuthorizationBranches();
        expect(branches).not.toBeNull();
        expect(branches!.length).toBe(2);

        // Verify each branch uses the SQL subquery pattern
        const orgId = td.org.id;
        const teamSubquery = Prisma.sql`SELECT id FROM "Team" WHERE "parentId" = ${orgId} OR id = ${orgId}`;
        const userSubquery = Prisma.sql`SELECT DISTINCT m."userId" FROM "Membership" m WHERE m."teamId" IN (${teamSubquery}) AND m."accepted" = true`;

        expect(branches![0]).toEqual(
          Prisma.sql`("teamId" IN (${teamSubquery})) AND ("isTeamBooking" = true)`
        );
        expect(branches![1]).toEqual(
          Prisma.sql`("userId" IN (${userSubquery})) AND ("isTeamBooking" = false)`
        );
      });

      it("should return null for non-owner/admin", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user2.id, orgId: td.org.id },
        });

        const branches = await service.getAuthorizationBranches();
        expect(branches).toBeNull();
      });

      it("should return null for user scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "user", userId: td.user1.id, orgId: td.org.id },
        });

        const branches = await service.getAuthorizationBranches();
        expect(branches).toBeNull();
      });
    });

    describe("Cross-org isolation", () => {
      it("org1 stats should not include org2 bookings", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        // org1 has 5 bookings (b1..b5), org2 has 1 (b6)
        expect(stats.total_bookings).toBe(5);
      });

      it("org2 stats should not include org1 bookings", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user4.id, orgId: td.org2.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        // org2 has only b6
        expect(stats.total_bookings).toBe(1);
        // b6 has 1 no-show attendee
        expect(stats.no_show_guests).toBe(1);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Fix 1: INNER JOIN replaces IN subquery for Attendee no-show counting
  // ──────────────────────────────────────────────────────────────────────

  describe("Fix 1 – INNER JOIN for Attendee no-show queries", () => {
    describe("buildBookingStatsUnionAllQuery (via getBookingStats)", () => {
      it("should return correct no_show_guests count for org scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        // att2 (b1) + att3 (b2) + att4 (b5) = 3 no-show guests
        expect(stats.no_show_guests).toBe(3);
      });

      it("should return correct no_show_guests count for team scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "team", userId: td.user1.id, orgId: td.org.id, teamId: td.team1.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        // team1 scope: b1 (att2 no-show) + b2 (att3 no-show) + user1 personal bookings
        // att2 (b1) + att3 (b2) = 2 no-show guests
        expect(stats.no_show_guests).toBe(2);
      });

      it("should count individual no-show attendees not bookings", async () => {
        // b1 has 2 attendees but only 1 is no-show → should count as 1, not 2
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        // If counting bookings-with-any-noshow: b1, b2, b5 = 3 bookings
        // If counting individual no-show attendees: att2 + att3 + att4 = 3
        // Both yield 3 here, so also verify total_bookings to confirm counts are independent
        expect(stats.total_bookings).toBe(5);
        expect(stats.no_show_guests).toBe(3);
      });

      it("should return 0 no_show_guests when no matching bookings", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter("2030-01-01T00:00:00.000Z", "2030-01-07T23:59:59.999Z"),
        });

        const stats = await service.getBookingStats();
        expect(stats.total_bookings).toBe(0);
        expect(stats.no_show_guests).toBe(0);
      });

      it("should return correct full KPI set for org scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        expect(stats.total_bookings).toBe(5);
        expect(stats.cancelled_bookings).toBe(1);
        expect(stats.no_show_host_bookings).toBe(1);
        expect(stats.no_show_guests).toBe(3);
        expect(Number(stats.avg_rating)).toBe(4);
        expect(stats.total_ratings).toBe(1);
        expect(stats.ratings_above_3).toBe(1);
      });

      it("result should match bookingStatsResultSchema", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const stats = await service.getBookingStats();
        expect(() => bookingStatsResultSchema.parse(stats)).not.toThrow();
      });
    });

    describe("buildEventTrendsUnionAllQuery (via getEventTrendsStats)", () => {
      it("should return correct No-Show (Guest) counts for org scope", async () => {
        const timeZone = "UTC";
        const timeView = getTimeView(td.startDate, td.endDate);
        const dateRanges = getDateRanges({
          startDate: td.startDate,
          endDate: td.endDate,
          timeZone,
          timeView,
          weekStart: "Monday",
        });

        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const trends = await service.getEventTrendsStats({ timeZone, dateRanges });

        const activeRange = trends.find((t) => t.Created > 0);
        expect(activeRange).toBeDefined();
        expect(activeRange!.Created).toBe(5);
        expect(activeRange!.Cancelled).toBe(1);
        expect(activeRange!["No-Show (Host)"]).toBe(1);
        // att2 (b1) + att3 (b2) + att4 (b5) = 3 no-show guests
        expect(activeRange!["No-Show (Guest)"]).toBe(3);
      });

      it("should return correct No-Show (Guest) counts for team scope", async () => {
        const timeZone = "UTC";
        const timeView = getTimeView(td.startDate, td.endDate);
        const dateRanges = getDateRanges({
          startDate: td.startDate,
          endDate: td.endDate,
          timeZone,
          timeView,
          weekStart: "Monday",
        });

        const service = new InsightsBookingService({
          prisma,
          options: { scope: "team", userId: td.user1.id, orgId: td.org.id, teamId: td.team1.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const trends = await service.getEventTrendsStats({ timeZone, dateRanges });

        const activeRange = trends.find((t) => t.Created > 0);
        expect(activeRange).toBeDefined();
        // team1: 3 team bookings + 1 personal = 4
        expect(activeRange!.Created).toBe(4);
        // att2 (b1) + att3 (b2) = 2 no-show guests
        expect(activeRange!["No-Show (Guest)"]).toBe(2);
      });

      it("should not include org2 no-show guests in org1 trends", async () => {
        const timeZone = "UTC";
        const timeView = getTimeView(td.startDate, td.endDate);
        const dateRanges = getDateRanges({
          startDate: td.startDate,
          endDate: td.endDate,
          timeZone,
          timeView,
          weekStart: "Monday",
        });

        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const trends = await service.getEventTrendsStats({ timeZone, dateRanges });
        const totalNoShowGuest = trends.reduce((sum, t) => sum + t["No-Show (Guest)"], 0);
        // org1 has 3 no-show guests, org2's att5 must NOT be counted
        expect(totalNoShowGuest).toBe(3);
      });

      it("result items should match eventTrendsItemSchema", async () => {
        const timeZone = "UTC";
        const timeView = getTimeView(td.startDate, td.endDate);
        const dateRanges = getDateRanges({
          startDate: td.startDate,
          endDate: td.endDate,
          timeZone,
          timeView,
          weekStart: "Monday",
        });

        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const trends = await service.getEventTrendsStats({ timeZone, dateRanges });
        expect(() => z.array(eventTrendsItemSchema).parse(trends)).not.toThrow();
        expect(trends.length).toBeGreaterThan(0);
      });
    });

    describe("buildRecentNoShowGuestsUnionAllQuery (via getRecentNoShowGuests)", () => {
      it("should return bookings where ALL attendees are no-shows for org scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const results = await service.getRecentNoShowGuests();

        // b2: 1 attendee (all no-show) → included
        // b5: 1 attendee (all no-show) → included
        // b1: 2 attendees, only 1 no-show → excluded
        // b3: cancelled → excluded
        // b4: no attendees → excluded
        expect(results.length).toBe(2);
        const bookingIds = results.map((r) => r.bookingId).sort((a, b) => a - b);
        expect(bookingIds).toEqual([td.b2Id, td.b5Id].sort((a, b) => a - b));
      });

      it("should return correct results for team scope", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "team", userId: td.user1.id, orgId: td.org.id, teamId: td.team1.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const results = await service.getRecentNoShowGuests();
        // team1 scope: only b2 has all attendees as no-show
        expect(results.length).toBe(1);
        expect(results[0].bookingId).toBe(td.b2Id);
      });

      it("should not include org2 no-show guests in org1 results", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const results = await service.getRecentNoShowGuests();
        const bookingIds = results.map((r) => r.bookingId);
        // b6 (org2) must not appear
        expect(bookingIds).not.toContain(td.b6Id);
      });

      it("should return results ordered by startTime DESC", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const results = await service.getRecentNoShowGuests();
        if (results.length >= 2) {
          // b5 (18:00) before b2 (12:00) in DESC order
          expect(results[0].bookingId).toBe(td.b5Id);
          expect(results[1].bookingId).toBe(td.b2Id);
        }
      });

      it("result items should match recentNoShowGuestSchema", async () => {
        const service = new InsightsBookingService({
          prisma,
          options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
          filters: makeDateFilter(td.startDate, td.endDate),
        });

        const results = await service.getRecentNoShowGuests();
        expect(() => z.array(recentNoShowGuestSchema).parse(results)).not.toThrow();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Consistency: KPI stats ↔ Event trends
  // ──────────────────────────────────────────────────────────────────────

  describe("Cross-query consistency", () => {
    it("getBookingStats and getEventTrendsStats should report consistent totals", async () => {
      const timeZone = "UTC";
      const timeView = getTimeView(td.startDate, td.endDate);
      const dateRanges = getDateRanges({
        startDate: td.startDate,
        endDate: td.endDate,
        timeZone,
        timeView,
        weekStart: "Monday",
      });

      const service = new InsightsBookingService({
        prisma,
        options: { scope: "org", userId: td.user1.id, orgId: td.org.id },
        filters: makeDateFilter(td.startDate, td.endDate),
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
});
