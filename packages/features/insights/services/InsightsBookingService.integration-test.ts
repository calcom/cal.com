import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import prisma from "@calcom/prisma";
import type { Team, User, Membership } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import {
  InsightsBookingBaseService as InsightsBookingService,
  type InsightsBookingServicePublicOptions,
} from "./InsightsBookingBaseService";

const NOTHING_CONDITION = Prisma.sql`1=0`;

// Helper function to create unique test data
async function createTestData({
  teamRole = MembershipRole.MEMBER,
  orgRole = MembershipRole.MEMBER,
  moreTeamsAndUsers = [],
}: {
  teamRole?: MembershipRole;
  orgRole?: MembershipRole;
  moreTeamsAndUsers?: MembershipRole[][]; // Array of teams, each team has array of user roles
} = {}) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `test-user-${timestamp}-${randomSuffix}@example.com`,
      username: `testuser-${timestamp}-${randomSuffix}`,
      name: "Test User",
    },
  });

  // Create test organization
  const org = await prisma.team.create({
    data: {
      name: `Test Org ${timestamp}-${randomSuffix}`,
      slug: `test-org-${timestamp}-${randomSuffix}`,
      isOrganization: true,
    },
  });

  // Create test team under the organization
  const team = await prisma.team.create({
    data: {
      name: `Test Team ${timestamp}-${randomSuffix}`,
      slug: `test-team-${timestamp}-${randomSuffix}`,
      isOrganization: false,
      parentId: org.id,
    },
  });

  // Create test event type
  const eventType = await prisma.eventType.create({
    data: {
      title: "Test Event Type",
      slug: "test-event-type",
      length: 60,
      userId: user.id,
      teamId: team.id,
    },
  });

  // Create test booking
  const booking = await prisma.booking.create({
    data: {
      uid: `test-booking-${timestamp}-${randomSuffix}`,
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      userId: user.id,
      eventTypeId: eventType.id,
      status: BookingStatus.PENDING,
    },
  });

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      teamId: team.id,
      role: teamRole,
      accepted: true,
    },
  });

  const orgMembership = await prisma.membership.create({
    data: {
      userId: user.id,
      teamId: org.id,
      role: orgRole,
      accepted: true,
    },
  });

  // Create additional teams and users based on moreTeamsAndUsers
  const additionalTeams: Team[] = [];
  const additionalUsers: User[] = [];
  const additionalMemberships: Membership[] = [];

  for (let teamIndex = 0; teamIndex < moreTeamsAndUsers.length; teamIndex++) {
    const teamUserRoles = moreTeamsAndUsers[teamIndex];

    // Create the team
    const additionalTeam = await prisma.team.create({
      data: {
        name: `Test Team ${teamIndex + 2} ${timestamp}-${randomSuffix}`,
        slug: `test-team-${teamIndex + 2}-${timestamp}-${randomSuffix}`,
        isOrganization: false,
        parentId: org.id,
      },
    });
    additionalTeams.push(additionalTeam);

    // Create users for this team
    for (let userIndex = 0; userIndex < teamUserRoles.length; userIndex++) {
      const userRole = teamUserRoles[userIndex];

      // Create the user
      const additionalUser = await prisma.user.create({
        data: {
          email: `test-user-team${teamIndex + 2}-${userIndex + 1}-${timestamp}-${randomSuffix}@example.com`,
          username: `testuser-team${teamIndex + 2}-${userIndex + 1}-${timestamp}-${randomSuffix}`,
          name: `Test User Team${teamIndex + 2}-${userIndex + 1}`,
        },
      });
      additionalUsers.push(additionalUser);

      // Create the membership
      const additionalMembership = await prisma.membership.create({
        data: {
          userId: additionalUser.id,
          teamId: additionalTeam.id,
          role: userRole,
          accepted: true,
        },
      });
      additionalMemberships.push(additionalMembership);
    }
  }

  // Return test data and cleanup function
  return {
    user,
    org,
    orgMembership,
    team,
    eventType,
    booking,
    membership,
    additionalTeams,
    additionalUsers,
    additionalMemberships,
    cleanup: async () => {
      // Clean up additional memberships
      for (const membership of additionalMemberships) {
        await prisma.membership.delete({
          where: { id: membership.id },
        });
      }

      // Clean up additional users
      for (const user of additionalUsers) {
        await prisma.user.delete({
          where: { id: user.id },
        });
      }

      // Clean up additional teams
      for (const team of additionalTeams) {
        await prisma.team.delete({
          where: { id: team.id },
        });
      }

      // Clean up main test data
      await prisma.booking.deleteMany({
        where: { id: booking.id },
      });
      await prisma.eventType.deleteMany({
        where: { id: eventType.id },
      });
      await prisma.membership.deleteMany({
        where: { id: membership.id },
      });
      await prisma.membership.delete({
        where: { id: orgMembership.id },
      });
      await prisma.team.deleteMany({
        where: { id: team.id },
      });
      await prisma.team.deleteMany({
        where: { id: org.id },
      });
      await prisma.user.deleteMany({
        where: { id: user.id },
      });
    },
  };
}

describe("InsightsBookingService Integration Tests", () => {
  describe("Authorization Conditions", () => {
    it("should return NOTHING for invalid options", async () => {
      const service = new InsightsBookingService({
        prisma,
        options: null as unknown as InsightsBookingServicePublicOptions,
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(NOTHING_CONDITION);
    });

    it("should return NOTHING for non-owner/admin user", async () => {
      const testData = await createTestData();

      // Create a regular user who is not an owner/admin
      const regularUser = await prisma.user.create({
        data: {
          email: `regular-user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
          username: `regularuser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: "Regular User",
        },
      });

      // Add the user as a regular member (not owner/admin) to the organization
      const membership = await prisma.membership.create({
        data: {
          userId: regularUser.id,
          teamId: testData.org.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: regularUser.id,
          orgId: testData.org.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(NOTHING_CONDITION);

      // Clean up
      await prisma.membership.delete({
        where: { id: membership.id },
      });
      await prisma.user.delete({
        where: { id: regularUser.id },
      });
      await testData.cleanup();
    });

    it("should build user scope conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(Prisma.sql`("userId" = ${testData.user.id}) AND ("teamId" IS NULL)`);

      await testData.cleanup();
    });

    it("should build team scope conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(
        Prisma.sql`(("teamId" = ${testData.team.id}) AND ("isTeamBooking" = true)) OR (("userId" = ANY(${[
          testData.user.id,
        ]})) AND ("isTeamBooking" = false))`
      );

      // Clean up
      await testData.cleanup();
    });

    it("should build org scope conditions with SQL subqueries", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
        moreTeamsAndUsers: [
          [MembershipRole.MEMBER], // Team 2: 1 user with MEMBER role
          [MembershipRole.MEMBER], // Team 3: 1 user with MEMBER role
        ],
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();

      // The optimized implementation uses SQL subqueries instead of literal arrays.
      // Verify the Prisma.sql template matches the subquery structure.
      const orgId = testData.org.id;
      const teamSubquery = Prisma.sql`SELECT id FROM "Team" WHERE "parentId" = ${orgId} OR id = ${orgId}`;
      const userSubquery = Prisma.sql`SELECT DISTINCT m."userId" FROM "Membership" m WHERE m."teamId" IN (${teamSubquery}) AND m."accepted" = true`;

      expect(conditions).toEqual(
        Prisma.sql`(("teamId" IN (${teamSubquery})) AND ("isTeamBooking" = true)) OR (("userId" IN (${userSubquery})) AND ("isTeamBooking" = false))`
      );

      await testData.cleanup();
    });

    it("should build user scope conditions with null orgId", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: null,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(Prisma.sql`("userId" = ${testData.user.id}) AND ("teamId" IS NULL)`);

      await testData.cleanup();
    });

    it("should build user scope conditions with undefined orgId", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: null,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(Prisma.sql`("userId" = ${testData.user.id}) AND ("teamId" IS NULL)`);

      await testData.cleanup();
    });

    it("should build team scope conditions with null orgId for standalone team", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const standaloneTeam = await prisma.team.create({
        data: {
          name: "Standalone Team",
          slug: `standalone-team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          isOrganization: false,
          parentId: null,
        },
      });

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: standaloneTeam.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: null,
          teamId: standaloneTeam.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(
        Prisma.sql`(("teamId" = ${standaloneTeam.id}) AND ("isTeamBooking" = true)) OR (("userId" = ANY(${[
          testData.user.id,
        ]})) AND ("isTeamBooking" = false))`
      );

      await prisma.membership.deleteMany({
        where: { teamId: standaloneTeam.id },
      });
      await prisma.team.delete({
        where: { id: standaloneTeam.id },
      });
      await testData.cleanup();
    });

    it("should return NOTHING_CONDITION for team scope when team belongs to org but no orgId provided", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: null,
          teamId: testData.team.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(NOTHING_CONDITION);

      await testData.cleanup();
    });

    it("should build team scope conditions with undefined orgId for standalone team", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const standaloneTeam = await prisma.team.create({
        data: {
          name: "Standalone Team 2",
          slug: `standalone-team-2-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          isOrganization: false,
          parentId: null,
        },
      });

      await prisma.membership.create({
        data: {
          userId: testData.user.id,
          teamId: standaloneTeam.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: null,
          teamId: standaloneTeam.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(
        Prisma.sql`(("teamId" = ${standaloneTeam.id}) AND ("isTeamBooking" = true)) OR (("userId" = ANY(${[
          testData.user.id,
        ]})) AND ("isTeamBooking" = false))`
      );

      await prisma.membership.deleteMany({
        where: { teamId: standaloneTeam.id },
      });
      await prisma.team.delete({
        where: { id: standaloneTeam.id },
      });
      await testData.cleanup();
    });
  });

  describe("Filter Conditions", () => {
    it("should return null when no filters are provided", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toBeNull();

      await testData.cleanup();
    });

    it("should build eventTypeId filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "eventTypeId",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: [testData.eventType.id],
              },
            },
          ],
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual(
        Prisma.sql`("eventTypeId" IN (${Prisma.join([
          testData.eventType.id,
        ])}) OR "eventParentId" IN (${Prisma.join([testData.eventType.id])}))`
      );

      await testData.cleanup();
    });

    it("should build userId filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "userId",
              value: {
                type: ColumnFilterType.SINGLE_SELECT,
                data: testData.user.id,
              },
            },
          ],
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual(Prisma.sql`"userId" = ${testData.user.id}`);

      await testData.cleanup();
    });

    it("should combine multiple filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "eventTypeId",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: [testData.eventType.id],
              },
            },
            {
              id: "userId",
              value: {
                type: ColumnFilterType.SINGLE_SELECT,
                data: testData.user.id,
              },
            },
          ],
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual(
        Prisma.sql`(("eventTypeId" IN (${Prisma.join([
          testData.eventType.id,
        ])}) OR "eventParentId" IN (${Prisma.join([testData.eventType.id])}))) AND ("userId" = ${
          testData.user.id
        })`
      );

      await testData.cleanup();
    });

    it("should build status filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "status",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["pending", "accepted"],
              },
            },
          ],
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual(
        Prisma.sql`"status" IN (${Prisma.join([
          Prisma.sql`${"pending"}::"BookingStatus"`,
          Prisma.sql`${"accepted"}::"BookingStatus"`,
        ])})`
      );

      await testData.cleanup();
    });
  });

  describe("getBaseConditions", () => {
    it("should combine authorization and filter conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create a user-scoped event type (not team-scoped)
      const userEventType = await prisma.eventType.create({
        data: {
          title: "User Event Type",
          slug: "user-event-type",
          length: 60,
          userId: testData.user.id,
          teamId: null, // User-scoped, not team-scoped
        },
      });

      // Create a booking for the user-scoped event type
      const userBooking = await prisma.booking.create({
        data: {
          uid: `user-booking-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          title: "User Booking",
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: userEventType.id,
          status: BookingStatus.PENDING,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          columnFilters: [
            {
              id: "eventTypeId",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: [userEventType.id],
              },
            },
          ],
        },
      });

      const baseConditions = await service.getBaseConditions();
      const query = Prisma.sql`
        SELECT id FROM "BookingTimeStatusDenormalized"
        WHERE ${baseConditions}
      `;
      const results = await prisma.$queryRaw<{ id: number }[]>(query);

      // Should return the user booking since it matches both conditions
      expect(results).toEqual([
        {
          id: userBooking.id,
        },
      ]);

      // Clean up
      await prisma.booking.delete({
        where: { id: userBooking.id },
      });
      await prisma.eventType.delete({
        where: { id: userEventType.id },
      });
      await testData.cleanup();
    });
  });

  describe("getAverageEventDurationStats", () => {
    it("should return correct average for bookings within a single date range", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create two bookings — eventLength comes from EventType.length (60) via trigger
      const booking1 = await prisma.booking.create({
        data: {
          uid: `avg-dur-1-${Date.now()}-${Math.random()}`,
          title: "Meeting 1",
          startTime: yesterday,
          endTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: testData.eventType.id,
          status: BookingStatus.ACCEPTED,
        },
      });
      // Use a slightly different time to avoid idempotency key collision
      const yesterdayPlus1h = new Date(yesterday.getTime() + 60 * 60 * 1000);
      const booking2 = await prisma.booking.create({
        data: {
          uid: `avg-dur-2-${Date.now()}-${Math.random()}`,
          title: "Meeting 2",
          startTime: yesterdayPlus1h,
          endTime: new Date(yesterdayPlus1h.getTime() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: testData.eventType.id,
          status: BookingStatus.ACCEPTED,
        },
      });

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: threeDaysAgo.toISOString(),
                  endDate: now.toISOString(),
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: threeDaysAgo.toISOString(),
            endDate: now.toISOString(),
            formattedDate: "This week",
            formattedDateFull: "This week",
          },
        ],
        dateTarget: "startTime",
      });

      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry).toBeDefined();
      // Both bookings have eventLength = 60 (from EventType), so average = 60
      expect(entry.Average).toBe(60);

      await prisma.booking.deleteMany({ where: { id: { in: [booking1.id, booking2.id] } } });
      await testData.cleanup();
    });

    it("should return empty array when no date ranges provided", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [],
        dateTarget: "startTime",
      });

      expect(result).toEqual([]);
      await testData.cleanup();
    });

    it("should return 0 average for date ranges with no matching bookings", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Use a future date range where no bookings exist
      const futureStart = "2099-01-01T00:00:00.000Z";
      const futureEnd = "2099-12-31T23:59:59.000Z";

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: futureStart, endDate: futureEnd, preset: "custom" },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: futureStart,
            endDate: futureEnd,
            formattedDate: "Future",
            formattedDateFull: "Future",
          },
        ],
        dateTarget: "startTime",
      });

      expect(result).toHaveLength(1);
      expect(result[0].Average).toBe(0);

      await testData.cleanup();
    });

    it("should correctly aggregate across multiple date ranges", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      // Booking in the "recent" range
      const recentBooking = await prisma.booking.create({
        data: {
          uid: `avg-recent-${Date.now()}-${Math.random()}`,
          title: "Recent meeting",
          startTime: twoDaysAgo,
          endTime: new Date(twoDaysAgo.getTime() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: testData.eventType.id,
          status: BookingStatus.ACCEPTED,
        },
      });

      // Booking in the "older" range
      const olderBooking = await prisma.booking.create({
        data: {
          uid: `avg-older-${Date.now()}-${Math.random()}`,
          title: "Older meeting",
          startTime: fourDaysAgo,
          endTime: new Date(fourDaysAgo.getTime() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: testData.eventType.id,
          status: BookingStatus.ACCEPTED,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: sixDaysAgo.toISOString(),
                  endDate: now.toISOString(),
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: sixDaysAgo.toISOString(),
            endDate: new Date(fourDaysAgo.getTime() + 23 * 60 * 60 * 1000).toISOString(),
            formattedDate: "Older",
            formattedDateFull: "Older",
          },
          {
            startDate: new Date(twoDaysAgo.getTime() - 12 * 60 * 60 * 1000).toISOString(),
            endDate: now.toISOString(),
            formattedDate: "Recent",
            formattedDateFull: "Recent",
          },
        ],
        dateTarget: "startTime",
      });

      expect(result).toHaveLength(2);

      // result[0] is the "Older" range, result[1] is the "Recent" range
      expect(result).toHaveLength(2);
      // Both ranges should have bookings with average = 60 (EventType.length)
      expect(result[0].Average).toBe(60);
      expect(result[1].Average).toBe(60);

      await prisma.booking.deleteMany({ where: { id: { in: [recentBooking.id, olderBooking.id] } } });
      await testData.cleanup();
    });

    it("should produce different date groupings when timezone changes", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create a dedicated event type to avoid idempotency key collisions
      const tzEventType = await prisma.eventType.create({
        data: {
          title: "TZ Test Event",
          slug: `tz-test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          length: 60,
          userId: testData.user.id,
          teamId: testData.team.id,
        },
      });

      // Create a booking at 23:30 UTC — near midnight to test timezone boundary
      // In Pacific/Honolulu (-10), this is 13:30 same day (stays same date)
      // In Asia/Tokyo (+9), this is 08:30 next day (shifts date forward)
      const bookingTime = new Date("2099-06-15T23:30:00.000Z");

      const booking = await prisma.booking.create({
        data: {
          uid: `avg-tz-${Date.now()}-${Math.random()}`,
          title: "Late night meeting",
          startTime: bookingTime,
          endTime: new Date(bookingTime.getTime() + 60 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: tzEventType.id,
          status: BookingStatus.PENDING,
        },
      });

      const rangeStart = "2099-06-14T00:00:00.000Z";
      const rangeEnd = "2099-06-17T00:00:00.000Z";
      const dateRanges = [
        {
          startDate: "2099-06-14T00:00:00.000Z",
          endDate: "2099-06-17T00:00:00.000Z",
          formattedDate: "All",
          formattedDateFull: "All",
        },
      ];

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: { startDate: rangeStart, endDate: rangeEnd, preset: "custom" },
              },
            },
          ],
        },
      });

      // Both timezones should find the booking and return average = 60
      const resultHonolulu = await service.getAverageEventDurationStats({
        timeZone: "Pacific/Honolulu",
        dateRanges,
        dateTarget: "startTime",
      });
      const resultTokyo = await service.getAverageEventDurationStats({
        timeZone: "Asia/Tokyo",
        dateRanges,
        dateTarget: "startTime",
      });

      // Both should find the booking with the correct average
      expect(resultHonolulu).toHaveLength(1);
      expect(resultTokyo).toHaveLength(1);
      expect(resultHonolulu[0].Average).toBe(60);
      expect(resultTokyo[0].Average).toBe(60);

      // Now test with split date ranges to verify the date shifts.
      // The SQL `DATE(col AT TIME ZONE tz)` groups into different calendar days.
      // We can't assert exact day placement because it depends on the server timezone,
      // but we CAN verify that the two timezones produce different distributions
      // when we use narrow daily ranges.
      const dailyRanges = [
        {
          startDate: "2099-06-15T00:00:00.000Z",
          endDate: "2099-06-15T23:59:59.000Z",
          formattedDate: "Jun 15",
          formattedDateFull: "Jun 15",
        },
        {
          startDate: "2099-06-16T00:00:00.000Z",
          endDate: "2099-06-16T23:59:59.000Z",
          formattedDate: "Jun 16",
          formattedDateFull: "Jun 16",
        },
      ];

      const dailyHonolulu = await service.getAverageEventDurationStats({
        timeZone: "Pacific/Honolulu",
        dateRanges: dailyRanges,
        dateTarget: "startTime",
      });
      const dailyTokyo = await service.getAverageEventDurationStats({
        timeZone: "Asia/Tokyo",
        dateRanges: dailyRanges,
        dateTarget: "startTime",
      });

      // The booking should appear in exactly one of the two daily ranges for each timezone
      const honoluluNonZero = dailyHonolulu.filter((r) => r.Average > 0);
      const tokyoNonZero = dailyTokyo.filter((r) => r.Average > 0);
      expect(honoluluNonZero).toHaveLength(1);
      expect(tokyoNonZero).toHaveLength(1);
      expect(honoluluNonZero[0].Average).toBe(60);
      expect(tokyoNonZero[0].Average).toBe(60);

      // The key assertion: the booking lands on different dates in different timezones
      // Honolulu (-10): 23:30 UTC = 13:30 HST same day (Jun 15)
      // Tokyo (+9): 23:30 UTC = 08:30 JST next day (Jun 16)
      expect(honoluluNonZero[0].Date).not.toBe(tokyoNonZero[0].Date);

      await prisma.booking.deleteMany({ where: { id: booking.id } });
      await prisma.eventType.delete({ where: { id: tzEventType.id } });
      await testData.cleanup();
    });

    it("should use createdAt when dateTarget is createdAt", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const now = new Date();
      // The default booking from createTestData has startTime = now, createdAt = now
      // So it should appear in the current date range regardless of dateTarget

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "createdAt",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            formattedDate: "This period",
            formattedDateFull: "This period",
          },
        ],
        dateTarget: "createdAt",
      });

      expect(result).toHaveLength(1);
      // The createTestData booking has eventLength = 60
      expect(result[0].Average).toBe(60);

      await testData.cleanup();
    });

    it("should distribute bookings into daily ranges, not collapse into weekly buckets", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create bookings on two different days with different event types (different durations)
      const day1 = new Date("2099-07-01T10:00:00.000Z");
      const day2 = new Date("2099-07-02T10:00:00.000Z");

      const shortEventType = await prisma.eventType.create({
        data: {
          title: "Short Meeting",
          slug: `short-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          length: 15,
          userId: testData.user.id,
          teamId: testData.team.id,
        },
      });
      const longEventType = await prisma.eventType.create({
        data: {
          title: "Long Meeting",
          slug: `long-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          length: 90,
          userId: testData.user.id,
          teamId: testData.team.id,
        },
      });

      const booking1 = await prisma.booking.create({
        data: {
          uid: `daily-1-${Date.now()}-${Math.random()}`,
          title: "Short",
          startTime: day1,
          endTime: new Date(day1.getTime() + 15 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: shortEventType.id,
          status: BookingStatus.PENDING,
        },
      });
      const booking2 = await prisma.booking.create({
        data: {
          uid: `daily-2-${Date.now()}-${Math.random()}`,
          title: "Long",
          startTime: day2,
          endTime: new Date(day2.getTime() + 90 * 60 * 1000),
          userId: testData.user.id,
          eventTypeId: longEventType.id,
          status: BookingStatus.PENDING,
        },
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: "2099-07-01T00:00:00.000Z",
                  endDate: "2099-07-02T23:59:59.999Z",
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: "2099-07-01T00:00:00.000Z",
            endDate: "2099-07-01T23:59:59.999Z",
            formattedDate: "Jul 1",
            formattedDateFull: "Jul 1",
          },
          {
            startDate: "2099-07-02T00:00:00.000Z",
            endDate: "2099-07-02T23:59:59.999Z",
            formattedDate: "Jul 2",
            formattedDateFull: "Jul 2",
          },
        ],
        dateTarget: "startTime",
      });

      expect(result).toHaveLength(2);
      // Each day should have its own average, NOT collapsed into a single weekly bucket
      // Day 1: short meeting (15 min)
      // Day 2: long meeting (90 min)
      expect(result[0].Average).toBe(15);
      expect(result[1].Average).toBe(90);

      await prisma.booking.deleteMany({ where: { id: { in: [booking1.id, booking2.id] } } });
      await prisma.eventType.deleteMany({ where: { id: { in: [shortEventType.id, longEventType.id] } } });
      await testData.cleanup();
    });

    it("should return Date in dayjs 'll' format", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
        filters: {
          columnFilters: [
            {
              id: "startTime",
              value: {
                type: ColumnFilterType.DATE_RANGE,
                data: {
                  startDate: "2099-08-15T00:00:00.000Z",
                  endDate: "2099-08-15T23:59:59.999Z",
                  preset: "custom",
                },
              },
            },
          ],
        },
      });

      const dayjs = (await import("@calcom/dayjs")).default;
      const result = await service.getAverageEventDurationStats({
        timeZone: "UTC",
        dateRanges: [
          {
            startDate: "2099-08-15T00:00:00.000Z",
            endDate: "2099-08-15T23:59:59.999Z",
            formattedDate: "Aug 15",
            formattedDateFull: "Aug 15",
          },
        ],
        dateTarget: "startTime",
      });

      expect(result).toHaveLength(1);
      // Date should be in dayjs "ll" format (e.g. "Aug 15, 2099"), NOT formattedDateFull
      const expected = dayjs("2099-08-15T00:00:00.000Z").format("ll");
      expect(result[0].Date).toBe(expected);

      await testData.cleanup();
    });
  });
});
