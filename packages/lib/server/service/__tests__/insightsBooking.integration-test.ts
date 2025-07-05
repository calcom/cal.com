import type { Team, User, Membership } from "@prisma/client";
import type { ExpressionBuilder } from "kysely";
import { describe, expect, it } from "vitest";

import db from "@calcom/kysely";
import type { DB } from "@calcom/kysely";
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

function compileCondition(
  condition: (
    eb: ExpressionBuilder<DB, "BookingTimeStatusDenormalized">
  ) => ReturnType<ExpressionBuilder<DB, "BookingTimeStatusDenormalized">["and"]>
) {
  const compiled = db.selectFrom("BookingTimeStatusDenormalized").selectAll().where(condition).compile();
  const where = compiled.sql.replace(/^select \* from "BookingTimeStatusDenormalized" where /, "");
  return { where, parameters: compiled.parameters };
}

describe("InsightsBookingService Integration Tests", () => {
  describe("Authorization Conditions", () => {
    it("should return NOTHING for invalid options", async () => {
      const service = new InsightsBookingService({
        kysely: db,
        options: null as any,
      });
      await service.init();

      const conditions = await service.buildAuthorizationConditions();
      const { where, parameters } = compileCondition(conditions);
      expect(where).toEqual(`"id" = $1`);
      expect(parameters).toEqual([-1]);
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
        kysely: db,
        options: {
          scope: "org",
          userId: regularUser.id,
          orgId: testData.org.id,
        },
      });
      await service.init();

      const conditions = await service.buildAuthorizationConditions();
      const { where, parameters } = compileCondition(conditions);
      expect(where).toEqual(`"id" = $1`);
      expect(parameters).toEqual([-1]);

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
        kysely: db,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });
      await service.init();

      const conditions = await service.buildAuthorizationConditions();
      const { where, parameters } = compileCondition(conditions);
      expect(where).toEqual(`("userId" = $1 and "teamId" is null)`);
      expect(parameters).toEqual([testData.user.id]);

      await testData.cleanup();
    });

    it("should build team scope conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsBookingService({
        kysely: db,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: testData.team.id,
        },
      });
      await service.init();

      const conditions = await service.buildAuthorizationConditions();
      const { where, parameters } = compileCondition(conditions);
      expect(where).toEqual(
        `(("teamId" = $1 and "isTeamBooking" = $2) or ("userId" in ($3) and "isTeamBooking" = $4))`
      );
      expect(parameters).toEqual([testData.team.id, true, testData.user.id, false]);

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
        kysely: db,
        options: {
          scope: "org",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });
      await service.init();

      const conditions = await service.buildAuthorizationConditions();
      const { where, parameters } = compileCondition(conditions);
      expect(where).toEqual(
        `(("teamId" in ($1, $2, $3, $4) and "isTeamBooking" = $5) or ("userId" in ($6, $7, $8) and "isTeamBooking" = $9))`
      );
      expect(parameters).toEqual([
        testData.org.id,
        testData.team.id,
        team2.id,
        team3.id,
        true,
        testData.user.id,
        user2.id,
        user3.id,
        false,
      ]);

      await testData.cleanup();
    });
  });

  describe("Filter Conditions", () => {
    it("should return null when no filters are provided", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        kysely: db,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });
      await service.init();

      const conditions = await service.buildFilterConditions();
      expect(conditions).toBeNull();

      await testData.cleanup();
    });

    it("should build eventTypeId filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        kysely: db,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          eventTypeId: testData.eventType.id,
        },
      });
      await service.init();

      const conditions = await service.buildFilterConditions();
      expect(conditions).not.toBeNull();
      const { where, parameters } = compileCondition(conditions!);
      expect(where).toEqual(`("eventTypeId" = $1 or "eventParentId" = $2)`);
      expect(parameters).toEqual([testData.eventType.id, testData.eventType.id]);

      await testData.cleanup();
    });

    it("should build memberUserId filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        kysely: db,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          memberUserId: testData.user.id,
        },
      });
      await service.init();

      const conditions = await service.buildFilterConditions();
      expect(conditions).not.toBeNull();
      const { where, parameters } = compileCondition(conditions!);
      expect(where).toEqual(`"userId" = $1`);
      expect(parameters).toEqual([testData.user.id]);

      await testData.cleanup();
    });

    it("should combine multiple filter conditions", async () => {
      const testData = await createTestData();

      const service = new InsightsBookingService({
        kysely: db,
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
      await service.init();

      const conditions = await service.buildFilterConditions();
      expect(conditions).not.toBeNull();
      const { where, parameters } = compileCondition(conditions!);
      expect(where).toEqual(`(("eventTypeId" = $1 or "eventParentId" = $2) and "userId" = $3)`);
      expect(parameters).toEqual([testData.eventType.id, testData.eventType.id, testData.user.id]);

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
        kysely: db,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
        filters: {
          eventTypeId: userEventType.id,
        },
      });
      await service.init();

      const query = service.query().select(["id", "title"]);
      const compiled = query.compile();
      expect(compiled.sql).toEqual(
        `select "id", "title" from "BookingTimeStatusDenormalized" where (("userId" = $1 and "teamId" is null) and ("eventTypeId" = $2 or "eventParentId" = $3))`
      );
      expect(compiled.parameters).toEqual([testData.user.id, userEventType.id, userEventType.id]);

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
