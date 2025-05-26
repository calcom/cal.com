import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import type { AttributeOption } from "@calcom/prisma/client";
import { AttributeType, MembershipRole } from "@calcom/prisma/enums";

import type { Attribute } from "./getAttributes";
import { getAttributesForTeam, getAttributesAssignmentData, getUsersAttributes } from "./getAttributes";

// Helper functions to create test data
async function createMockAttribute({
  orgId,
  options,
  ...attributeData
}: {
  orgId: number;
  id: string;
  type: AttributeType;
  name: string;
  slug: string;
  options: Pick<AttributeOption, "id" | "value" | "slug" | "contains" | "isGroup">[];
}) {
  const attribute = await prismock.attribute.create({
    data: {
      ...attributeData,
      teamId: orgId,
      enabled: true,
      usersCanEditRelation: true,
      isWeightsEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prismock.attributeOption.createMany({
    data: options.map((option) => ({
      ...option,
      attributeId: attribute.id,
    })),
  });

  const result = await prismock.attribute.findUnique({
    where: { id: attribute.id },
    // eslint-disable-next-line @calcom/eslint/no-prisma-include-true
    include: { options: true },
  });
  if (!result) {
    throw new Error("Some error in creating mock attribute");
  }
  return result;
}

async function createMockUserHavingMembershipWithBothTeamAndOrg({
  orgId,
  teamId,
}: {
  orgId: number;
  teamId: number;
}) {
  const user = await prismock.user.create({
    data: {
      name: "Test User",
      email: "test@test.com",
    },
  });

  // Create org membership
  const orgMembership = await prismock.membership.create({
    data: {
      role: MembershipRole.MEMBER,
      disableImpersonation: false,
      accepted: true,
      teamId: orgId,
      userId: user.id,
    },
  });

  // Create team membership
  const teamMembership = await prismock.membership.create({
    data: {
      role: MembershipRole.MEMBER,
      disableImpersonation: false,
      accepted: true,
      teamId: teamId,
      userId: user.id,
    },
  });

  return { user, teamMembership, orgMembership };
}

async function createMockTeam({ orgId }: { orgId: number | null }) {
  return await prismock.team.create({
    data: {
      name: "Test Team",
      slug: "test-team",
      parentId: orgId,
    },
  });
}

async function createMockAttributeAssignment({
  orgMembershipId,
  attributeOptionId,
}: {
  orgMembershipId: number;
  attributeOptionId: string;
}) {
  return await prismock.attributeToUser.create({
    data: {
      memberId: orgMembershipId,
      attributeOptionId,
    },
  });
}

async function expectAttributeToMatch(attribute: Attribute, expected: Attribute) {
  expect(attribute).toMatchObject({
    id: expected.id,
    name: expected.name,
    slug: expected.slug,
    type: expected.type,
  });
}

async function expectAttributesToMatch(attributes: Attribute[], expected: Attribute[]) {
  expect(attributes).toHaveLength(expected.length);
  for (let i = 0; i < attributes.length; i++) {
    expectAttributeToMatch(attributes[i], expected[i]);
  }
}

describe("getAttributes", () => {
  const orgId = 1001;

  beforeEach(async () => {
    // @ts-expect-error reset is a method on Prismock
    await prismock.reset();
  });

  describe("getAttributesForTeam", () => {
    it("should return empty array for team without parent (non-org team)", async () => {
      const teamWithoutParent = await createMockTeam({ orgId: null });
      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "opt1", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "opt2", value: "Sales", slug: "sales", isGroup: false, contains: [] },
        ],
      });

      const attributes = await getAttributesForTeam({ teamId: teamWithoutParent.id });
      expect(attributes).toHaveLength(0);
    });

    it("should return attributes assigned to team members", async () => {
      const team = await createMockTeam({ orgId });
      const { teamMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      const attribute = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "opt1", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "opt2", value: "Sales", slug: "sales", isGroup: false, contains: [] },
        ],
      });

      await createMockAttributeAssignment({
        orgMembershipId: teamMembership.id,
        attributeOptionId: "opt1",
      });

      const attributes = await getAttributesForTeam({ teamId: team.id });

      expect(attributes).toHaveLength(1);
      expect(attributes[0]).toMatchObject({
        id: attribute.id,
        name: attribute.name,
        type: attribute.type,
      });
    });
  });

  describe("getAttributesAssignmentData", () => {
    it("should return team members with their assigned attributes", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      const attr1 = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "engineering-id", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "sales-id", value: "Sales", slug: "sales", isGroup: false, contains: [] },
          {
            id: "engineering-and-sales-id",
            value: "EngineeringAndSales",
            slug: "engineering-and-sales",
            isGroup: true,
            contains: ["engineering-id", "sales-id"],
          },
        ],
      });

      const attr2 = await createMockAttribute({
        orgId,
        id: "attr2",
        name: "Territory",
        slug: "territory",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "india-id", value: "India", slug: "india", isGroup: false, contains: [] },
          { id: "china-id", value: "China", slug: "china", isGroup: false, contains: [] },
        ],
      });

      // Unassigned attribute
      const attr3 = await createMockAttribute({
        orgId,
        id: "attr3",
        name: "Attr3",
        slug: "attr3",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "opt1", value: "Opt1", slug: "opt1", isGroup: false, contains: [] },
          { id: "opt2", value: "Opt2", slug: "opt2", isGroup: false, contains: [] },
        ],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        // Assigning a group option that has its sub-options not assigned directly to the user
        attributeOptionId: "engineering-and-sales-id",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "india-id",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "engineering-id",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: team.id, orgId });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0]).toEqual({
        userId: user.id,
        attributes: {
          attr1: {
            type: AttributeType.MULTI_SELECT,
            attributeOption: [
              {
                isGroup: true,
                value: "EngineeringAndSales",
                contains: [
                  {
                    id: "engineering-id",
                    slug: "engineering",
                    value: "Engineering",
                  },
                  { id: "sales-id", slug: "sales", value: "Sales" },
                ],
              },
              {
                isGroup: false,
                value: "Engineering",
                contains: [],
              },
            ],
          },
          attr2: {
            type: AttributeType.SINGLE_SELECT,
            attributeOption: { isGroup: false, value: "India", contains: [] },
          },
          // attr3 - unassigned isn't here
        },
      });

      expectAttributesToMatch(attributesOfTheOrg, [attr1, attr2, attr3]);
    });

    it("should return contains correctly for group options that have sub-options not assigned directly to the user", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      const attr1 = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "engineering-id", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "sales-id", value: "Sales", slug: "sales", isGroup: false, contains: [] },
          {
            id: "engineering-and-sales-id",
            value: "EngineeringAndSales",
            slug: "engineering-and-sales",
            isGroup: true,
            contains: ["engineering-id", "sales-id"],
          },
        ],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        // Assigning a group option that has its sub-options not assigned directly to the user
        attributeOptionId: "engineering-and-sales-id",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: team.id, orgId });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0]).toEqual({
        userId: user.id,
        attributes: {
          attr1: {
            type: AttributeType.MULTI_SELECT,
            attributeOption: {
              isGroup: true,
              value: "EngineeringAndSales",
              contains: [
                {
                  id: "engineering-id",
                  slug: "engineering",
                  value: "Engineering",
                },
                { id: "sales-id", slug: "sales", value: "Sales" },
              ],
            },
          },
        },
      });

      expectAttributesToMatch(attributesOfTheOrg, [attr1]);
    });

    it("should return no attributes for a different org", async () => {
      const team = await createMockTeam({ orgId });
      const otherOrgId = 1002;
      const otherOrgsTeam = await createMockTeam({ orgId: otherOrgId });
      const { orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "engineering-id", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "sales-id", value: "Sales", slug: "sales", isGroup: false, contains: [] },
          {
            id: "engineering-and-sales-id",
            value: "EngineeringAndSales",
            slug: "engineering-and-sales",
            isGroup: true,
            contains: ["engineering-id", "sales-id"],
          },
        ],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        // Assigning a group option that has its sub-options not assigned directly to the user
        attributeOptionId: "engineering-and-sales-id",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: otherOrgsTeam.id, orgId: otherOrgId });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(0);
      // Because created attribute is of other org, it should not be returned
      expect(attributesOfTheOrg).toHaveLength(0);
    });

    it("should handle multi-select attributes correctly", async () => {
      const team = await createMockTeam({ orgId });
      const { orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      const attr1 = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Skills",
        slug: "skills",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "opt1", value: "JavaScript", slug: "javascript", isGroup: false, contains: [] },
          { id: "opt2", value: "Python", slug: "python", isGroup: false, contains: [] },
        ],
      });

      // Assign multiple skills
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "opt1",
      });
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "opt2",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: team.id, orgId });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0].attributes.attr1.attributeOption).toEqual([
        { value: "JavaScript", isGroup: false, contains: [] },
        { value: "Python", isGroup: false, contains: [] },
      ]);

      expectAttributesToMatch(attributesOfTheOrg, [attr1]);
    });
  });

  describe("getUsersAttributes", () => {
    it("should return attributes assigned to specific user in team", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      const attribute = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "opt1", value: "Engineering", slug: "engineering", isGroup: false, contains: [] }],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "opt1",
      });

      const userAttributes = await getUsersAttributes({ userId: user.id, teamId: team.id });

      expect(userAttributes).toHaveLength(1);
      expect(userAttributes[0]).toMatchObject({
        id: attribute.id,
        name: attribute.name,
        type: attribute.type,
      });
    });
  });
});
