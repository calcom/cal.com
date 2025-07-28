import type { Team, User, Membership } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";

import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import prisma from "@calcom/prisma";
import { BookingStatus, MembershipRole } from "@calcom/prisma/enums";

import { InsightsRoutingBaseService as InsightsRoutingService } from "../../service/insightsRoutingBase";

// SQL condition constants for testing
const NOTHING_CONDITION = Prisma.sql`1=0`;

// Helper function to create default filters for testing
const createDefaultFilters = () => ({
  startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  endDate: new Date().toISOString(),
});

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
        filters: createDefaultFilters(),
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(NOTHING_CONDITION);
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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
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

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toMatchInlineSnapshot(`
        e {
          "strings": [
            ""formUserId" = ",
            " AND "formTeamId" IS NULL",
          ],
          "values": [
            ${testData.user.id},
          ],
        }
      `);

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
        filters: createDefaultFilters(),
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(Prisma.sql`"formTeamId" = ${testData.team.id}`);

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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      const conditions = await service.getAuthorizationConditions();

      expect(conditions).toMatchInlineSnapshot(`
        e {
          "strings": [
            "("formTeamId" = ANY(",
            ")) OR ("formUserId" = ",
            " AND "formTeamId" IS NULL)",
          ],
          "values": [
            [
              ${testData.org.id},
              ${testData.team.id},
              ${team2.id},
              ${team3.id},
            ],
            ${testData.user.id},
          ],
        }
      `);

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
        filters: createDefaultFilters(),
      });

      const conditions = await service.getAuthorizationConditions();
      expect(conditions).toEqual(NOTHING_CONDITION);

      // Clean up
      await prisma.team.delete({
        where: { id: unrelatedTeam.id },
      });
      await testData.cleanup();
    });
  });

  describe("Filter Conditions", () => {
    it("should build filter conditions when dates are provided", async () => {
      const testData = await createTestData();

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
      });

      const conditions = await service.getFilterConditions();
      expect(conditions).toEqual(
        Prisma.sql`"createdAt" >= ${"2024-01-01"}::timestamp AND "createdAt" <= ${"2024-12-31"}::timestamp`
      );

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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      // First call should build conditions
      const conditions1 = await service.getAuthorizationConditions();
      expect(conditions1).toEqual(Prisma.sql`"formUserId" = ${testData.user.id} AND "formTeamId" IS NULL`);

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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      // First call should build conditions
      const conditions1 = await service.getFilterConditions();
      expect(conditions1).toBeDefined();

      // Second call should use cached conditions
      const conditions2 = await service.getFilterConditions();
      expect(conditions2).toEqual(conditions1);

      await testData.cleanup();
    });
  });

  describe("getBaseConditions", () => {
    it("should combine authorization and filter conditions", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const filters = createDefaultFilters();
      const dateCondition = Prisma.sql`"createdAt" >= ${filters.startDate}::timestamp AND "createdAt" <= ${filters.endDate}::timestamp`;

      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters,
      });

      const results = await service.getBaseConditions();
      expect(results).toEqual(
        Prisma.sql`(("formUserId" = ${testData.user.id} AND "formTeamId" IS NULL) AND (${dateCondition}))`
      );

      await testData.cleanup();
    });

    it("should include personal form in org scope", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const personalForm = await prisma.app_RoutingForms_Form.create({
        data: {
          name: "My Personal Form",
          userId: testData.user.id,
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

      const personalFormResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: `personal-form-filler-${randomUUID()}`,
          formId: personalForm.id,
          response: {
            "text-field-id": {
              label: "Name",
              value: "Personal Form Response",
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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      const baseConditions = await service.getBaseConditions();
      const results = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "RoutingFormResponseDenormalized" WHERE ${baseConditions}
      `;

      // Should only return the authorized user's form response
      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe(testData.formResponse.id);
      expect(results[1]?.id).toBe(personalFormResponse.id);

      // Clean up
      await prisma.app_RoutingForms_FormResponse.delete({
        where: { id: personalFormResponse.id },
      });
      await prisma.app_RoutingForms_Form.delete({
        where: { id: personalForm.id },
      });
      await testData.cleanup();
    });

    it("should get personal form response", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const personalForm = await prisma.app_RoutingForms_Form.create({
        data: {
          name: "My Personal Form",
          userId: testData.user.id,
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

      const personalFormResponse = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formFillerId: `personal-form-filler-${randomUUID()}`,
          formId: personalForm.id,
          response: {
            "text-field-id": {
              label: "Name",
              value: "Personal Form Response",
            },
          },
        },
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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      const baseConditions = await service.getBaseConditions();
      const results = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "RoutingFormResponseDenormalized" WHERE ${baseConditions}
      `;

      // Should only return the authorized user's form response
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(personalFormResponse.id);
      expect(results[0]?.id).not.toBe(otherFormResponse.id);

      // Clean up
      await prisma.app_RoutingForms_FormResponse.deleteMany({
        where: { id: { in: [personalFormResponse.id, otherFormResponse.id] } },
      });
      await prisma.app_RoutingForms_Form.deleteMany({
        where: { id: { in: [personalForm.id, otherForm.id] } },
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
          teamId: undefined,
        },
        filters: createDefaultFilters(),
      });

      const baseConditions = await service.getBaseConditions();
      const results = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "RoutingFormResponseDenormalized" WHERE ${baseConditions}
      `;

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

  describe("columnFilters", () => {
    it("should handle empty columnFilters", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`"createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${defaultFilters.endDate}::timestamp`
      );

      await testData.cleanup();
    });

    it("should handle undefined columnFilters", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: undefined,
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`"createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${defaultFilters.endDate}::timestamp`
      );

      await testData.cleanup();
    });

    it("should filter by booking status order (multi-select)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingStatusOrder",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["pending", "accepted"],
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingStatusOrder" = ANY(${["pending", "accepted"]}))`
      );

      await testData.cleanup();
    });

    it("should filter by booking assignment reason (text)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingAssignmentReason",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "contains", operand: "manual" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingAssignmentReason" ILIKE ${`%manual%`})`
      );

      await testData.cleanup();
    });

    it("should filter by booking UID (text)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingUid",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "equals", operand: "test-booking-123" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingUid" = ${"test-booking-123"})`
      );

      await testData.cleanup();
    });

    it("should filter by member user IDs (multi-select)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingUserId",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: [testData.user.id, 999],
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingUserId" = ANY(${[testData.user.id, 999]}))`
      );

      await testData.cleanup();
    });

    it("should filter by booking attendees (text)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingAttendees",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "contains", operand: "john@example.com" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND (EXISTS (
      SELECT 1 FROM "Booking" b
      INNER JOIN "Attendee" a ON a."bookingId" = b."id"
      WHERE b."uid" = "RoutingFormResponseDenormalized"."bookingUid"
      AND (${Prisma.sql`(a.name ILIKE ${`%john@example.com%`}) OR (a.email ILIKE ${`%john@example.com%`})`})
    ))`
      );

      await testData.cleanup();
    });

    it("should filter by custom form fields (text)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "custom-field-id",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "equals", operand: "test value" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND (EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${"custom-field-id"}
        AND rrf."valueString" = ${"test value"}
      ))`
      );

      await testData.cleanup();
    });

    it("should filter by custom form fields (multi-select)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "custom-multi-field-id",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["option1", "option2"],
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND (EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${"custom-multi-field-id"}
        AND rrf."valueStringArray" @> ${["option1", "option2"]}
      ))`
      );

      await testData.cleanup();
    });

    it("should combine multiple filters with AND", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingStatusOrder",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["pending"],
              },
            },
            {
              id: "bookingAssignmentReason",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "contains", operand: "manual" },
              },
            },
            {
              id: "custom-field-id",
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "equals", operand: "test" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`((("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingStatusOrder" = ANY(${[
          "pending",
        ]}))) AND ("bookingAssignmentReason" ILIKE ${`%manual%`})) AND (EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${"custom-field-id"}
        AND rrf."valueString" = ${"test"}
      ))`
      );

      await testData.cleanup();
    });

    it("should filter by form ID (single-select)", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "formId",
              value: {
                type: ColumnFilterType.SINGLE_SELECT,
                data: "form-123",
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("formId" = ${"form-123"})`
      );

      await testData.cleanup();
    });

    it("should filter by form ID with other filters", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "formId",
              value: {
                type: ColumnFilterType.SINGLE_SELECT,
                data: "form-456",
              },
            },
            {
              id: "bookingStatusOrder",
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["pending", "accepted"],
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`(("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingStatusOrder" = ANY(${[
          "pending",
          "accepted",
        ]}))) AND ("formId" = ${"form-456"})`
      );

      await testData.cleanup();
    });

    it("should exclude system filters from form field processing", async () => {
      const testData = await createTestData({
        teamRole: MembershipRole.OWNER,
        orgRole: MembershipRole.OWNER,
      });

      const defaultFilters = createDefaultFilters();
      const service = new InsightsRoutingService({
        prisma,
        options: {
          scope: "user",
          userId: testData.user.id,
          orgId: testData.org.id,
          teamId: undefined,
        },
        filters: {
          ...defaultFilters,
          columnFilters: [
            {
              id: "bookingStatusOrder", // System filter
              value: {
                type: ColumnFilterType.MULTI_SELECT,
                data: ["pending"],
              },
            },
            {
              id: "custom-field-id", // Custom field filter
              value: {
                type: ColumnFilterType.TEXT,
                data: { operator: "equals", operand: "test" },
              },
            },
          ],
        },
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toEqual(
        Prisma.sql`(("createdAt" >= ${defaultFilters.startDate}::timestamp AND "createdAt" <= ${
          defaultFilters.endDate
        }::timestamp) AND ("bookingStatusOrder" = ANY(${["pending"]}))) AND (EXISTS (
        SELECT 1 FROM "RoutingFormResponseField" rrf
        WHERE rrf."responseId" = "RoutingFormResponseDenormalized"."id"
        AND rrf."fieldId" = ${"custom-field-id"}
        AND rrf."valueString" = ${"test"}
      ))`
      );

      await testData.cleanup();
    });

    it("should return null when no filters are applied", async () => {
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
          teamId: undefined,
        },
        filters: {},
      });

      const filterConditions = await service.getFilterConditions();
      expect(filterConditions).toBeNull();

      await testData.cleanup();
    });
  });
});
