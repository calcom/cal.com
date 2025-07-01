import type { Team, User, Membership } from "@prisma/client";
import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { InsightsBookingService } from "../../service/insightsBooking";

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
        options: null as any,
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual({ id: -1 });
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
      expect(conditions).toEqual({ id: -1 });

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
      expect(conditions).toEqual({
        AND: [
          {
            userId: testData.user.id,
            teamId: null,
          },
        ],
      });

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
      expect(conditions).toEqual({
        AND: [
          {
            OR: [
              {
                teamId: testData.team.id,
                isTeamBooking: true,
              },
              {
                userId: {
                  in: [testData.user.id],
                },
                isTeamBooking: false,
              },
            ],
          },
        ],
      });

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

      expect(conditions).toEqual({
        AND: [
          {
            OR: [
              {
                teamId: {
                  in: [testData.org.id, testData.team.id, team2.id, team3.id],
                },
                isTeamBooking: true,
              },
              {
                userId: {
                  in: [testData.user.id, user2.id, user3.id],
                },
                isTeamBooking: false,
              },
            ],
          },
        ],
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
          eventTypeId: testData.eventType.id,
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual({
        AND: [
          {
            OR: [{ eventTypeId: testData.eventType.id }, { eventParentId: testData.eventType.id }],
          },
        ],
      });

      await testData.cleanup();
    });

    it("should build memberUserId filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          memberUserId: testData.user.id,
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual({
        AND: [
          {
            userId: testData.user.id,
          },
        ],
      });

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
          eventTypeId: testData.eventType.id,
          memberUserId: testData.user.id,
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual({
        AND: [
          {
            OR: [{ eventTypeId: testData.eventType.id }, { eventParentId: testData.eventType.id }],
          },
          {
            userId: testData.user.id,
          },
        ],
      });

      await testData.cleanup();
    });
  });

  describe("Caching", () => {
    it("should cache authorization conditions", async () => {
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

      // First call should build conditions
      const conditions1 = await service.getAuthorizationConditions();
      expect(conditions1).toEqual({
        AND: [
          {
            userId: testData.user.id,
            teamId: null,
          },
        ],
      });

      // Second call should use cached conditions
      const conditions2 = await service.getAuthorizationConditions();
      expect(conditions2).toEqual(conditions1);

      // Clean up
      await testData.cleanup();
    });

    it("should cache filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          eventTypeId: testData.eventType.id,
        },
      });

      // First call should build conditions
      const conditions1 = await service.getFilterConditions();
      expect(conditions1).toEqual({
        AND: [
          {
            OR: [{ eventTypeId: testData.eventType.id }, { eventParentId: testData.eventType.id }],
          },
        ],
      });

      // Second call should use cached conditions
      const conditions2 = await service.getFilterConditions();
      expect(conditions2).toEqual(conditions1);

      await testData.cleanup();
    });
  });

  describe("findMany", () => {
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
          eventTypeId: userEventType.id,
        },
      });

      const results = await service.findMany({
        select: {
          id: true,
          title: true,
        },
      });

      // Should return the user booking since it matches both conditions
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(userBooking.id);

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
