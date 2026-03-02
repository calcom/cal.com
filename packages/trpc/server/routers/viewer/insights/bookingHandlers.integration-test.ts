import { randomUUID } from "node:crypto";

import dayjs from "@calcom/dayjs";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import type { ColumnFilter } from "@calcom/features/data-table/lib/types";
import { getInsightsBookingService } from "@calcom/features/di/containers/InsightsBooking";
import {
  extractDateRangeFromColumnFilters,
  replaceDateRangeColumnFilter,
} from "@calcom/features/insights/lib/bookingUtils";
import { getDateRanges, getTimeView } from "@calcom/features/insights/server/insightsDateUtils";
import prisma from "@calcom/prisma";
import type { Team, User, Membership, EventType, Booking } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const timestamp = Date.now();
const suffix = randomUUID().slice(0, 8);

/**
 * Creates an InsightsBookingService instance the same way the handler does.
 */
function createBookingService(
  user: { id: number; organizationId: number | null },
  input: {
    scope: "user" | "team" | "org";
    selectedTeamId?: number;
    columnFilters?: ColumnFilter[];
  }
) {
  return getInsightsBookingService({
    options: {
      scope: input.scope,
      userId: user.id,
      orgId: user.organizationId,
      ...(input.selectedTeamId && { teamId: input.selectedTeamId }),
    },
    filters: {
      ...(input.columnFilters && { columnFilters: input.columnFilters }),
    },
  });
}

/**
 * Creates standard column filters with a date range for testing.
 */
function createDateColumnFilters(startDate: string, endDate: string): ColumnFilter[] {
  return [
    {
      id: "startTime",
      value: {
        type: ColumnFilterType.DATE_RANGE,
        data: {
          startDate,
          endDate,
          preset: "custom",
        },
      },
    },
  ];
}

// Test data holders
let orgOwner: User;
let teamMember: User;
let org: Team;
let team: Team;
let eventType: EventType;
let bookings: Booking[] = [];
let orgOwnerOrgMembership: Membership;
let orgOwnerTeamMembership: Membership;
let teamMemberMembership: Membership;

const startDate = dayjs().subtract(7, "day").startOf("day").toISOString();
const endDate = dayjs().endOf("day").toISOString();

describe("Booking handler integration tests", () => {
  beforeAll(async () => {
    // Create org
    org = await prisma.team.create({
      data: {
        name: `BH Org ${timestamp}-${suffix}`,
        slug: `bh-org-${timestamp}-${suffix}`,
        isOrganization: true,
      },
    });

    // Create team under org
    team = await prisma.team.create({
      data: {
        name: `BH Team ${timestamp}-${suffix}`,
        slug: `bh-team-${timestamp}-${suffix}`,
        parentId: org.id,
      },
    });

    // Create org owner
    orgOwner = await prisma.user.create({
      data: {
        email: `bh-orgowner-${timestamp}-${suffix}@example.com`,
        username: `bh-orgowner-${timestamp}-${suffix}`,
        name: "BH Org Owner",
        organizationId: org.id,
      },
    });

    // Create team member
    teamMember = await prisma.user.create({
      data: {
        email: `bh-member-${timestamp}-${suffix}@example.com`,
        username: `bh-member-${timestamp}-${suffix}`,
        name: "BH Team Member",
      },
    });

    // Memberships
    orgOwnerOrgMembership = await prisma.membership.create({
      data: {
        userId: orgOwner.id,
        teamId: org.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    orgOwnerTeamMembership = await prisma.membership.create({
      data: {
        userId: orgOwner.id,
        teamId: team.id,
        role: MembershipRole.OWNER,
        accepted: true,
      },
    });

    teamMemberMembership = await prisma.membership.create({
      data: {
        userId: teamMember.id,
        teamId: team.id,
        role: MembershipRole.MEMBER,
        accepted: true,
      },
    });

    // Create event type
    eventType = await prisma.eventType.create({
      data: {
        title: `BH Event ${timestamp}-${suffix}`,
        slug: `bh-event-${timestamp}-${suffix}`,
        length: 30,
        userId: orgOwner.id,
        teamId: team.id,
      },
    });

    // Create bookings with different statuses
    const bookingData = [
      {
        uid: `bh-accepted-1-${timestamp}-${suffix}`,
        title: "Accepted Booking 1",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().subtract(3, "day").toDate(),
        endTime: dayjs().subtract(3, "day").add(30, "minute").toDate(),
        rating: 5,
        ratingFeedback: "Great session!",
        noShowHost: false,
      },
      {
        uid: `bh-accepted-2-${timestamp}-${suffix}`,
        title: "Accepted Booking 2",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().subtract(2, "day").toDate(),
        endTime: dayjs().subtract(2, "day").add(30, "minute").toDate(),
        rating: 3,
        ratingFeedback: "Average",
        noShowHost: false,
      },
      {
        uid: `bh-cancelled-${timestamp}-${suffix}`,
        title: "Cancelled Booking",
        status: BookingStatus.CANCELLED,
        startTime: dayjs().subtract(4, "day").toDate(),
        endTime: dayjs().subtract(4, "day").add(30, "minute").toDate(),
        rating: null,
        ratingFeedback: null,
        noShowHost: false,
      },
      {
        uid: `bh-noshow-${timestamp}-${suffix}`,
        title: "No Show Booking",
        status: BookingStatus.ACCEPTED,
        startTime: dayjs().subtract(5, "day").toDate(),
        endTime: dayjs().subtract(5, "day").add(30, "minute").toDate(),
        rating: null,
        ratingFeedback: null,
        noShowHost: true,
      },
      {
        uid: `bh-pending-${timestamp}-${suffix}`,
        title: "Pending Booking",
        status: BookingStatus.PENDING,
        startTime: dayjs().subtract(1, "day").toDate(),
        endTime: dayjs().subtract(1, "day").add(30, "minute").toDate(),
        rating: null,
        ratingFeedback: null,
        noShowHost: false,
      },
    ];

    for (const data of bookingData) {
      const booking = await prisma.booking.create({
        data: {
          uid: data.uid,
          title: data.title,
          status: data.status,
          startTime: data.startTime,
          endTime: data.endTime,
          userId: orgOwner.id,
          eventTypeId: eventType.id,
          rating: data.rating,
          ratingFeedback: data.ratingFeedback,
          noShowHost: data.noShowHost,
        },
      });
      bookings.push(booking);

      // Create attendee for each booking
      await prisma.attendee.create({
        data: {
          name: `Attendee for ${data.title}`,
          email: `attendee-${data.uid}@example.com`,
          bookingId: booking.id,
          timeZone: "UTC",
        },
      });
    }
  });

  afterAll(async () => {
    try {
      // Clean up in reverse order of creation
      const bookingIds = bookings.map((b) => b.id);
      if (bookingIds.length > 0) {
        await prisma.attendee.deleteMany({ where: { bookingId: { in: bookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (eventType?.id) {
        await prisma.eventType.deleteMany({ where: { id: eventType.id } });
      }
      const membershipIds = [
        orgOwnerOrgMembership?.id,
        orgOwnerTeamMembership?.id,
        teamMemberMembership?.id,
      ].filter(Boolean);
      if (membershipIds.length > 0) {
        await prisma.membership.deleteMany({ where: { id: { in: membershipIds } } });
      }
      const userIds = [orgOwner?.id, teamMember?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      if (team?.id) {
        await prisma.team.deleteMany({ where: { id: team.id } });
      }
      if (org?.id) {
        await prisma.team.deleteMany({ where: { id: org.id } });
      }
    } catch (error) {
      console.warn("Cleanup failed:", error);
    }
  });

  describe("bookingKPIStats", () => {
    it("should return KPI stats with populated booking data", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const currentStats = await service.getBookingStats();

      expect(currentStats).toBeDefined();
      expect(typeof currentStats.total_bookings).toBe("number");
      expect(typeof currentStats.completed_bookings).toBe("number");
      expect(typeof currentStats.cancelled_bookings).toBe("number");
      expect(typeof currentStats.rescheduled_bookings).toBe("number");
      expect(typeof currentStats.no_show_host_bookings).toBe("number");
      expect(typeof currentStats.no_show_guests).toBe("number");
      expect(typeof currentStats.total_ratings).toBe("number");
      expect(typeof currentStats.ratings_above_3).toBe("number");
    });

    it("should calculate period-over-period deltas via previous period service", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const currentService = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const previousPeriodDates = currentService.calculatePreviousPeriodDates();
      expect(previousPeriodDates).toBeDefined();
      expect(previousPeriodDates.startDate).toBeDefined();
      expect(previousPeriodDates.endDate).toBeDefined();

      const previousColumnFilters = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate: previousPeriodDates.startDate,
        newEndDate: previousPeriodDates.endDate,
      });

      const previousService = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters: previousColumnFilters }
      );

      const previousStats = await previousService.getBookingStats();
      expect(previousStats).toBeDefined();
      expect(typeof previousStats.total_bookings).toBe("number");
    });

    it("should return empty response for user scope with no bookings", async () => {
      // Team member has no bookings in our test setup
      const farFutureStart = dayjs().add(1, "year").toISOString();
      const farFutureEnd = dayjs().add(1, "year").add(7, "day").toISOString();
      const columnFilters = createDateColumnFilters(farFutureStart, farFutureEnd);

      const service = createBookingService(
        { id: teamMember.id, organizationId: null },
        { scope: "user", columnFilters }
      );

      const stats = await service.getBookingStats();
      expect(stats.total_bookings).toBe(0);
      expect(stats.completed_bookings).toBe(0);
    });
  });

  describe("eventTrends", () => {
    it("should return event trends grouped by time view", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const { startDate: start, endDate: end, dateTarget } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(start, end);
      const dateRanges = getDateRanges({
        startDate: start,
        endDate: end,
        timeView,
        timeZone: "UTC",
        weekStart: "Sunday",
      });

      const result = await service.getEventTrendsStats({
        timeZone: "UTC",
        dateRanges,
        dateTarget,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("popularEvents", () => {
    it("should return popular events stats", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getPopularEventsStats();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("averageEventDuration", () => {
    it("should return all bookings for duration calculation", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const allBookings = await service.findAll({
        select: {
          eventLength: true,
          createdAt: true,
          startTime: true,
        },
      });

      expect(Array.isArray(allBookings)).toBe(true);
      // Each booking should have the selected fields
      if (allBookings.length > 0) {
        expect(allBookings[0]).toHaveProperty("eventLength");
        expect(allBookings[0]).toHaveProperty("createdAt");
        expect(allBookings[0]).toHaveProperty("startTime");
      }
    });
  });

  describe("membersWithMostBookings", () => {
    it("should return members sorted by most bookings DESC", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({ type: "all", sortOrder: "DESC" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithLeastBookings", () => {
    it("should return members sorted by least bookings ASC", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({ type: "all", sortOrder: "ASC" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithMostCompletedBookings", () => {
    it("should return members with most completed bookings", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({
        type: "accepted",
        sortOrder: "DESC",
        completed: true,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithLeastCompletedBookings", () => {
    it("should return members with least completed bookings", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({
        type: "accepted",
        sortOrder: "ASC",
        completed: true,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithMostCancelledBookings", () => {
    it("should return members with most cancelled bookings", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({
        type: "cancelled",
        sortOrder: "DESC",
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithHighestRatings", () => {
    it("should return members sorted by highest rating DESC", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersRatingStats("DESC");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithLowestRatings", () => {
    it("should return members sorted by lowest rating ASC", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersRatingStats("ASC");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("membersWithMostNoShow", () => {
    it("should return members with most no shows", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getMembersStatsWithCount({ type: "noShow", sortOrder: "DESC" });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("recentRatings", () => {
    it("should return recent ratings data", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getRecentRatingsStats();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("recentNoShowGuests", () => {
    it("should return recent no-show guests data", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getRecentNoShowGuests();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("rawData", () => {
    it("should return paginated CSV data with default limit and offset", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getCsvData({
        limit: 100,
        offset: 0,
        timeZone: "UTC",
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
    });

    it("should respect limit parameter", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getCsvData({
        limit: 2,
        offset: 0,
        timeZone: "UTC",
      });

      expect(result).toBeDefined();
      if (result.data) {
        expect(result.data.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("bookingsByHourStats", () => {
    it("should return bookings grouped by hour", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const result = await service.getBookingsByHourStats({
        timeZone: "UTC",
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("noShowHostsOverTime", () => {
    it("should return no-show hosts over time data", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const { startDate: start, endDate: end, dateTarget } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(start, end);
      const dateRanges = getDateRanges({
        startDate: start,
        endDate: end,
        timeView,
        timeZone: "UTC",
        weekStart: "Sunday",
      });

      const result = await service.getNoShowHostsOverTimeStats({
        timeZone: "UTC",
        dateRanges,
        dateTarget,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("csatOverTime", () => {
    it("should return CSAT over time data", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const { startDate: start, endDate: end, dateTarget } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(start, end);
      const dateRanges = getDateRanges({
        startDate: start,
        endDate: end,
        timeView,
        timeZone: "UTC",
        weekStart: "Sunday",
      });

      const result = await service.getCSATOverTimeStats({
        timeZone: "UTC",
        dateRanges,
        dateTarget,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("scope-based access", () => {
    it("should support team scope with selectedTeamId", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "team", selectedTeamId: team.id, columnFilters }
      );

      const stats = await service.getBookingStats();
      expect(stats).toBeDefined();
    });

    it("should support org scope", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "org", columnFilters }
      );

      const stats = await service.getBookingStats();
      expect(stats).toBeDefined();
    });

    it("should support user scope", async () => {
      const columnFilters = createDateColumnFilters(startDate, endDate);
      const service = createBookingService(
        { id: orgOwner.id, organizationId: org.id },
        { scope: "user", columnFilters }
      );

      const stats = await service.getBookingStats();
      expect(stats).toBeDefined();
    });
  });
});
