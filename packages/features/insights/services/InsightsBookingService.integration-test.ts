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

    it("should build org scope conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
        moreTeamsAndUsers: [
          [MembershipRole.MEMBER], // Team 2: 1 user with MEMBER role
          [MembershipRole.MEMBER], // Team 3: 1 user with MEMBER role
        ],
      });

      // Get references to additional data
      const user2 = testData.additionalUsers[0]; // First user from first team
      const user3 = testData.additionalUsers[1]; // First user from second team
      const team2 = testData.additionalTeams[0]; // First additional team
      const team3 = testData.additionalTeams[1]; // Second additional team

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();

      expect(conditions).toEqual(
        Prisma.sql`(("teamId" = ANY(${[
          testData.org.id,
          testData.team.id,
          team2.id,
          team3.id,
        ]})) AND ("isTeamBooking" = true)) OR (("userId" = ANY(${[
          testData.user.id,
          user2.id,
          user3.id,
        ]})) AND ("isTeamBooking" = false))`
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
});
