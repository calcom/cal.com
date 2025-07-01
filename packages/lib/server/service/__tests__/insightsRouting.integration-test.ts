import type { Team, User, Membership } from "@prisma/client";
import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";

import prisma from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { InsightsRoutingService } from "../../service/insightsRouting";

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
  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `test-user-${randomUUID()}@example.com`,
      username: `testuser-${randomUUID()}`,
      name: "Test User",
    },
  });

  // Create test organization
  const org = await prisma.team.create({
    data: {
      name: "Test Org",
      slug: `test-org-${randomUUID()}`,
      isOrganization: true,
    },
  });

  // Create test team under the organization
  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      slug: `test-team-${randomUUID()}`,
      isOrganization: false,
      parentId: org.id,
    },
  });

  // Create test event type
  const eventType = await prisma.eventType.create({
    data: {
      title: "Test Event Type",
      slug: `test-event-type-${randomUUID()}`,
      length: 60,
      userId: user.id,
      teamId: team.id,
    },
  });

  // Create test booking
  const booking = await prisma.booking.create({
    data: {
      uid: `test-booking-${randomUUID()}`,
      title: "Test Booking",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      userId: user.id,
      eventTypeId: eventType.id,
      status: BookingStatus.PENDING,
    },
  });

  // Create test routing form
  const form = await prisma.app_RoutingForms_Form.create({
    data: {
      name: "Test Routing Form",
      userId: user.id,
      teamId: team.id,
      fields: [
        {
          id: `text-field-id-${randomUUID()}`,
          type: "text",
          label: "Name",
          required: true,
        },
        {
          id: `email-field-id-${randomUUID()}`,
          type: "email",
          label: "Email",
          required: true,
        },
      ],
    },
  });

  // Create test form response
  const formResponse = await prisma.app_RoutingForms_FormResponse.create({
    data: {
      formFillerId: `test-filler-${randomUUID()}`,
      formId: form.id,
      response: {
        [`text-field-id-${randomUUID()}`]: {
          label: "Name",
          value: "Test Name",
        },
        [`email-field-id-${randomUUID()}`]: {
          label: "Email",
          value: "test@example.com",
        },
      },
      routedToBookingUid: booking.uid,
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

  for (let i = 0; i < moreTeamsAndUsers.length; i++) {
    const teamRoles = moreTeamsAndUsers[i];
    const additionalTeam = await prisma.team.create({
      data: {
        name: `Additional Team ${i + 1}`,
        slug: `additional-team-${i + 1}-${randomUUID()}`,
        isOrganization: false,
        parentId: org.id,
      },
    });
    additionalTeams.push(additionalTeam);

    for (let j = 0; j < teamRoles.length; j++) {
      const role = teamRoles[j];
      const additionalUser = await prisma.user.create({
        data: {
          email: `additional-user-${i}-${j}-${randomUUID()}@example.com`,
          username: `additionaluser-${i}-${j}-${randomUUID()}`,
          name: `Additional User ${i}-${j}`,
        },
      });
      additionalUsers.push(additionalUser);

      const additionalMembership = await prisma.membership.create({
        data: {
          userId: additionalUser.id,
          teamId: additionalTeam.id,
          role: role,
          accepted: true,
        },
      });
      additionalMemberships.push(additionalMembership);
    }
  }

  // Cleanup function
  const cleanup = async () => {
    // Delete in reverse order to avoid foreign key constraints
    for (const membership of additionalMemberships) {
      await prisma.membership.delete({
        where: { id: membership.id },
      });
    }
    for (const user of additionalUsers) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }
    for (const team of additionalTeams) {
      await prisma.team.delete({
        where: { id: team.id },
      });
    }

    await prisma.membership.delete({
      where: { id: orgMembership.id },
    });
    await prisma.membership.delete({
      where: { id: membership.id },
    });
    await prisma.app_RoutingForms_FormResponse.delete({
      where: { id: formResponse.id },
    });
    await prisma.booking.delete({
      where: { id: booking.id },
    });
    await prisma.eventType.delete({
      where: { id: eventType.id },
    });
    await prisma.app_RoutingForms_Form.delete({
      where: { id: form.id },
    });
    await prisma.team.delete({
      where: { id: team.id },
    });
    await prisma.team.delete({
      where: { id: org.id },
    });
    await prisma.user.delete({
      where: { id: user.id },
    });
  };

  return {
    user,
    org,
    team,
    eventType,
    booking,
    form,
    formResponse,
    membership,
    orgMembership,
    additionalTeams,
    additionalUsers,
    additionalMemberships,
    cleanup,
  };
}

describe("InsightsRoutingService Integration Tests", () => {
  describe("Authorization Conditions", () => {
    it("should return NOTHING for invalid options", async () => {
      const service = new InsightsRoutingService({
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
          email: `regular-user-${randomUUID()}@example.com`,
          username: `regularuser-${randomUUID()}`,
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

      const service = new InsightsRoutingService({
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

      const service = new InsightsRoutingService({
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
            formUserId: testData.user.id,
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

      const service = new InsightsRoutingService({
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
            formTeamId: testData.team.id,
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
      const team2 = testData.additionalTeams[0]; // First additional team
      const team3 = testData.additionalTeams[1]; // Second additional team

      const service = new InsightsRoutingService({
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
            formTeamId: {
              in: [testData.org.id, testData.team.id, team2.id, team3.id],
            },
          },
        ],
      });

      await testData.cleanup();
    });

    it("should return NOTHING for team scope when team is not child of org", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create a team that is not a child of the org
      const unrelatedTeam = await prisma.team.create({
        data: {
          name: "Unrelated Team",
          slug: `unrelated-team-${randomUUID()}`,
          isOrganization: false,
          parentId: null, // Not part of the org
        },
      });

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "team",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: unrelatedTeam.id,
        },
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual({ AND: [{ id: -1 }] });

      // Clean up
      await prisma.team.delete({
        where: { id: unrelatedTeam.id },
      });
      await testData.cleanup();
    });
  });

  describe("Filter Conditions", () => {
    it("should return null when no filters are provided", async () => {
      const testData = await createTestData();

      const service = new InsightsRoutingService({
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
  });

  describe("Caching", () => {
    it("should cache authorization conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const service = new InsightsRoutingService({
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
            formUserId: testData.user.id,
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

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      // First call should build conditions
      const conditions1 = await service.getFilterConditions();
      expect(conditions1).toBeNull();

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

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const results = await service.findMany({
        select: {
          id: true,
          formName: true,
        },
      });

      // Should return the user form response since it matches the authorization conditions
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(testData.formResponse.id);

      await testData.cleanup();
    });

    it("should filter out unauthorized responses", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create another user and form
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${randomUUID()}@example.com`,
          username: `otheruser-${randomUUID()}`,
          name: "Other User",
        },
      });

      const otherForm = await prisma.app_RoutingForms_Form.create({
        data: {
          name: "Other User Form",
          userId: otherUser.id,
          teamId: null,
          fields: [
            {
              id: "text-field-id",
              type: "text",
              label: "Name",
              required: true,
            },
          ],
        },
      });

      const otherFormResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: `other-form-filler-${randomUUID()}`,
          formId: otherForm.id,
          response: {
            "text-field-id": {
              label: "Name",
              value: "Other Form Response",
            },
          },
        },
      });

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const results = await service.findMany({
        select: {
          id: true,
          formName: true,
        },
      });

      // Should only return the authorized user's form response
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(testData.formResponse.id);
      expect(results[0]?.id).not.toBe(otherFormResponse.id);

      // Clean up
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: otherFormResponse.id },
      });
      await prisma.app_RoutingForms_Form.delete({
        where: { id: otherForm.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
      await testData.cleanup();
    });

    it("should fetch all forms in org scope when user is in same team", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      // Create another user in the same team
      const teamMember = await prisma.user.create({
        data: {
          email: `team-member-${randomUUID()}@example.com`,
          username: `teammember-${randomUUID()}`,
          name: "Team Member",
        },
      });

      // Add the team member to the same team
      const teamMembership = await prisma.membership.create({
        data: {
          userId: teamMember.id,
          teamId: testData.team.id,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      });

      // Create a form under the team member
      const teamMemberForm = await prisma.app_RoutingForms_Form.create({
        data: {
          name: "Team Member Form",
          userId: teamMember.id,
          teamId: testData.team.id, // Same team as the original user
          fields: [
            {
              id: `text-field-id-${randomUUID()}`,
              type: "text",
              label: "Name",
              required: true,
            },
          ],
        },
      });

      // Create a form response for the team member's form
      const teamMemberFormResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: `team-member-form-filler-${randomUUID()}`,
          formId: teamMemberForm.id,
          response: {
            [`text-field-id-${randomUUID()}`]: {
              label: "Name",
              value: "Team Member Form Response",
            },
          },
        },
      });

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "org",
          userId: testData.user.id,
          orgId: testData.org.id,
        },
      });

      const results = await service.findMany({
        select: {
          id: true,
          formName: true,
        },
      });

      // Should return both form responses (original user's and team member's)
      expect(results).toHaveLength(2);

      const responseIds = results.map((r) => r.id).sort();
      const expectedIds = [testData.formResponse.id, teamMemberFormResponse.id].sort();
      expect(responseIds).toEqual(expectedIds);

      // Clean up
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: teamMemberFormResponse.id },
      });
      await prisma.app_RoutingForms_Form.delete({
        where: { id: teamMemberForm.id },
      });
      await prisma.membership.delete({
        where: { id: teamMembership.id },
      });
      await prisma.user.delete({
        where: { id: teamMember.id },
      });
      await testData.cleanup();
    });
  });
});
