import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import type { AttributeOption } from "@calcom/prisma/client";
import { AttributeType, MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";

import {
  getAttributesForTeam,
  getAttributesAssignmentData,
  getUsersAttributes,
  extractAttributeIdsFromQueryValue,
} from "./getAttributes";

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

  describe("Map-based lookup optimization", () => {
    it("should correctly resolve attribute options when multiple attributes have many options", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      // Create multiple attributes with multiple options to test the Map lookup
      const attr1 = await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "dept-sales", value: "Sales", slug: "sales", isGroup: false, contains: [] },
          { id: "dept-marketing", value: "Marketing", slug: "marketing", isGroup: false, contains: [] },
        ],
      });

      const attr2 = await createMockAttribute({
        orgId,
        id: "attr2",
        name: "Location",
        slug: "location",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "loc-us", value: "United States", slug: "us", isGroup: false, contains: [] },
          { id: "loc-uk", value: "United Kingdom", slug: "uk", isGroup: false, contains: [] },
          { id: "loc-de", value: "Germany", slug: "de", isGroup: false, contains: [] },
        ],
      });

      const attr3 = await createMockAttribute({
        orgId,
        id: "attr3",
        name: "Skills",
        slug: "skills",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "skill-js", value: "JavaScript", slug: "javascript", isGroup: false, contains: [] },
          { id: "skill-py", value: "Python", slug: "python", isGroup: false, contains: [] },
          { id: "skill-go", value: "Go", slug: "go", isGroup: false, contains: [] },
        ],
      });

      // Assign options from different attributes
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "loc-uk",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "skill-js",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "skill-py",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: team.id, orgId });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      const userAssignment = attributesAssignedToTeamMembersWithOptions[0];
      expect(userAssignment.userId).toBe(user.id);

      // Verify each attribute was correctly resolved via Map lookup
      expect(userAssignment.attributes.attr1).toEqual({
        type: AttributeType.SINGLE_SELECT,
        attributeOption: { isGroup: false, value: "Engineering", contains: [] },
      });

      expect(userAssignment.attributes.attr2).toEqual({
        type: AttributeType.SINGLE_SELECT,
        attributeOption: { isGroup: false, value: "United Kingdom", contains: [] },
      });

      expect(userAssignment.attributes.attr3).toEqual({
        type: AttributeType.MULTI_SELECT,
        attributeOption: [
          { isGroup: false, value: "JavaScript", contains: [] },
          { isGroup: false, value: "Python", contains: [] },
        ],
      });

      expectAttributesToMatch(attributesOfTheOrg, [attr1, attr2, attr3]);
    });

    it("should handle group options with nested contains correctly via Map lookup", async () => {
      const team = await createMockTeam({ orgId });
      const { orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      // Create attribute with group option that contains other options
      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Region",
        slug: "region",
        type: AttributeType.MULTI_SELECT,
        options: [
          { id: "region-na", value: "North America", slug: "na", isGroup: false, contains: [] },
          { id: "region-eu", value: "Europe", slug: "eu", isGroup: false, contains: [] },
          { id: "region-apac", value: "APAC", slug: "apac", isGroup: false, contains: [] },
          {
            id: "region-global",
            value: "Global",
            slug: "global",
            isGroup: true,
            contains: ["region-na", "region-eu", "region-apac"],
          },
        ],
      });

      // Assign the group option
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "region-global",
      });

      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
      });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      const userAssignment = attributesAssignedToTeamMembersWithOptions[0];

      // Verify the group option's contains array was correctly enriched via Map lookup
      expect(userAssignment.attributes.attr1).toEqual({
        type: AttributeType.MULTI_SELECT,
        attributeOption: {
          isGroup: true,
          value: "Global",
          contains: [
            { id: "region-na", value: "North America", slug: "na" },
            { id: "region-eu", value: "Europe", slug: "eu" },
            { id: "region-apac", value: "APAC", slug: "apac" },
          ],
        },
      });
    });

    it("should handle multiple users with different attribute assignments efficiently", async () => {
      const team = await createMockTeam({ orgId });

      // Create first user
      const user1 = await prismock.user.create({
        data: { name: "User 1", email: "user1@test.com" },
      });
      const orgMembership1 = await prismock.membership.create({
        data: {
          role: MembershipRole.MEMBER,
          disableImpersonation: false,
          accepted: true,
          teamId: orgId,
          userId: user1.id,
        },
      });
      await prismock.membership.create({
        data: {
          role: MembershipRole.MEMBER,
          disableImpersonation: false,
          accepted: true,
          teamId: team.id,
          userId: user1.id,
        },
      });

      // Create second user
      const user2 = await prismock.user.create({
        data: { name: "User 2", email: "user2@test.com" },
      });
      const orgMembership2 = await prismock.membership.create({
        data: {
          role: MembershipRole.MEMBER,
          disableImpersonation: false,
          accepted: true,
          teamId: orgId,
          userId: user2.id,
        },
      });
      await prismock.membership.create({
        data: {
          role: MembershipRole.MEMBER,
          disableImpersonation: false,
          accepted: true,
          teamId: team.id,
          userId: user2.id,
        },
      });

      // Create attribute with options
      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Level",
        slug: "level",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "level-junior", value: "Junior", slug: "junior", isGroup: false, contains: [] },
          { id: "level-senior", value: "Senior", slug: "senior", isGroup: false, contains: [] },
          { id: "level-lead", value: "Lead", slug: "lead", isGroup: false, contains: [] },
        ],
      });

      // Assign different options to different users
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership1.id,
        attributeOptionId: "level-junior",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership2.id,
        attributeOptionId: "level-senior",
      });

      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
      });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(2);

      // Find each user's assignment
      const user1Assignment = attributesAssignedToTeamMembersWithOptions.find((a) => a.userId === user1.id);
      const user2Assignment = attributesAssignedToTeamMembersWithOptions.find((a) => a.userId === user2.id);

      expect(user1Assignment?.attributes.attr1).toEqual({
        type: AttributeType.SINGLE_SELECT,
        attributeOption: { isGroup: false, value: "Junior", contains: [] },
      });

      expect(user2Assignment?.attributes.attr1).toEqual({
        type: AttributeType.SINGLE_SELECT,
        attributeOption: { isGroup: false, value: "Senior", contains: [] },
      });
    });

    it("should handle empty attributes gracefully", async () => {
      const team = await createMockTeam({ orgId });
      const { user } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      // Create attribute with no options
      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Empty Attribute",
        slug: "empty-attribute",
        type: AttributeType.SINGLE_SELECT,
        options: [],
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } =
        await getAttributesAssignmentData({ teamId: team.id, orgId });

      // Team member should still be included (with empty attributes) even though there are no assignments.
      // This is important for "not any in" filters where members without the attribute should match.
      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0]).toEqual({
        userId: user.id,
        attributes: {},
      });
      expect(attributesOfTheOrg).toHaveLength(1);
    });

    it("should handle option IDs that don't exist in the org's attributes", async () => {
      const team = await createMockTeam({ orgId });
      const { orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
        ],
      });

      // Create an assignment with a valid option
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      // Create an assignment with an invalid option ID (simulating data inconsistency)
      await prismock.attributeToUser.create({
        data: {
          memberId: orgMembership.id,
          attributeOptionId: "non-existent-option",
        },
      });

      // The function should handle this gracefully and only return valid assignments
      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
      });

      // Should only have the valid assignment
      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0].attributes.attr1).toEqual({
        type: AttributeType.SINGLE_SELECT,
        attributeOption: { isGroup: false, value: "Engineering", contains: [] },
      });
    });
  });

  describe("getAttributesAssignmentData with attributeIds filter", () => {
    it("should return only assignments for specified attributeIds when filter is provided", async () => {
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
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "dept-sales", value: "Sales", slug: "sales", isGroup: false, contains: [] },
        ],
      });

      const attr2 = await createMockAttribute({
        orgId,
        id: "attr2",
        name: "Territory",
        slug: "territory",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "territory-india", value: "India", slug: "india", isGroup: false, contains: [] },
          { id: "territory-china", value: "China", slug: "china", isGroup: false, contains: [] },
        ],
      });

      const attr3 = await createMockAttribute({
        orgId,
        id: "attr3",
        name: "Level",
        slug: "level",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "level-senior", value: "Senior", slug: "senior", isGroup: false, contains: [] },
          { id: "level-junior", value: "Junior", slug: "junior", isGroup: false, contains: [] },
        ],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "territory-india",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "level-senior",
      });

      const { attributesOfTheOrg, attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
        attributeIds: ["attr1", "attr2"],
      });

      expect(attributesOfTheOrg).toHaveLength(2);
      expect(attributesOfTheOrg.map((a) => a.id).sort()).toEqual(["attr1", "attr2"]);

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(attributesAssignedToTeamMembersWithOptions[0].userId).toBe(user.id);
      expect(Object.keys(attributesAssignedToTeamMembersWithOptions[0].attributes)).toEqual(["attr1", "attr2"]);
      expect(attributesAssignedToTeamMembersWithOptions[0].attributes.attr1).toBeDefined();
      expect(attributesAssignedToTeamMembersWithOptions[0].attributes.attr2).toBeDefined();
      expect(attributesAssignedToTeamMembersWithOptions[0].attributes.attr3).toBeUndefined();
    });

    it("should return all assignments when attributeIds is undefined", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] }],
      });

      await createMockAttribute({
        orgId,
        id: "attr2",
        name: "Territory",
        slug: "territory",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "territory-india", value: "India", slug: "india", isGroup: false, contains: [] }],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "territory-india",
      });

      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
      });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(Object.keys(attributesAssignedToTeamMembersWithOptions[0].attributes)).toHaveLength(2);
    });

    it("should return all assignments when attributeIds is an empty array (backwards compatible)", async () => {
      const team = await createMockTeam({ orgId });
      const { orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] }],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
        attributeIds: [],
      });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(Object.keys(attributesAssignedToTeamMembersWithOptions[0].attributes)).toHaveLength(1);
    });

    it("should return only matching assignments when some attributeIds do not exist", async () => {
      const team = await createMockTeam({ orgId });
      const { user, orgMembership } = await createMockUserHavingMembershipWithBothTeamAndOrg({
        orgId,
        teamId: team.id,
      });

      await createMockAttribute({
        orgId,
        id: "attr1",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] }],
      });

      await createMockAttributeAssignment({
        orgMembershipId: orgMembership.id,
        attributeOptionId: "dept-eng",
      });

      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
        attributeIds: ["attr1", "non-existent-attr"],
      });

      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(1);
      expect(Object.keys(attributesAssignedToTeamMembersWithOptions[0].attributes)).toEqual(["attr1"]);
    });

    it("should include team members without any assignment for queried attributes (important for 'not any in' filters)", async () => {
      const team = await createMockTeam({ orgId });

      // User 1 has Department assignment
      const { user: user1, orgMembership: orgMembership1 } =
        await createMockUserHavingMembershipWithBothTeamAndOrg({
          orgId,
          teamId: team.id,
        });

      // User 2 only has Location assignment (no Department)
      const user2 = await prismock.user.create({
        data: { name: "User 2", email: "user2@test.com" },
      });
      const orgMembership2 = await prismock.membership.create({
        data: { role: MembershipRole.MEMBER, disableImpersonation: false, accepted: true, teamId: orgId, userId: user2.id },
      });
      await prismock.membership.create({
        data: { role: MembershipRole.MEMBER, disableImpersonation: false, accepted: true, teamId: team.id, userId: user2.id },
      });

      // User 3 has no attribute assignments at all
      const user3 = await prismock.user.create({
        data: { name: "User 3", email: "user3@test.com" },
      });
      await prismock.membership.create({
        data: { role: MembershipRole.MEMBER, disableImpersonation: false, accepted: true, teamId: orgId, userId: user3.id },
      });
      await prismock.membership.create({
        data: { role: MembershipRole.MEMBER, disableImpersonation: false, accepted: true, teamId: team.id, userId: user3.id },
      });

      await createMockAttribute({
        orgId,
        id: "dept-attr",
        name: "Department",
        slug: "department",
        type: AttributeType.SINGLE_SELECT,
        options: [
          { id: "dept-eng", value: "Engineering", slug: "engineering", isGroup: false, contains: [] },
          { id: "dept-sales", value: "Sales", slug: "sales", isGroup: false, contains: [] },
        ],
      });

      await createMockAttribute({
        orgId,
        id: "loc-attr",
        name: "Location",
        slug: "location",
        type: AttributeType.SINGLE_SELECT,
        options: [{ id: "loc-nyc", value: "NYC", slug: "nyc", isGroup: false, contains: [] }],
      });

      // User 1: Department = Engineering
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership1.id,
        attributeOptionId: "dept-eng",
      });

      // User 2: Location = NYC (no Department)
      await createMockAttributeAssignment({
        orgMembershipId: orgMembership2.id,
        attributeOptionId: "loc-nyc",
      });

      // Query only for Department attribute (simulating "Department not any in [Sales]" filter)
      const { attributesAssignedToTeamMembersWithOptions } = await getAttributesAssignmentData({
        teamId: team.id,
        orgId,
        attributeIds: ["dept-attr"],
      });

      // All 3 team members should be included, even those without Department assignment
      expect(attributesAssignedToTeamMembersWithOptions).toHaveLength(3);

      const user1Data = attributesAssignedToTeamMembersWithOptions.find((m) => m.userId === user1.id);
      const user2Data = attributesAssignedToTeamMembersWithOptions.find((m) => m.userId === user2.id);
      const user3Data = attributesAssignedToTeamMembersWithOptions.find((m) => m.userId === user3.id);

      // User 1 has Department assignment
      expect(user1Data?.attributes["dept-attr"]).toBeDefined();
      expect(user1Data?.attributes["dept-attr"].attributeOption).toMatchObject({ value: "Engineering" });

      // User 2 and User 3 should be included with empty attributes (for "not any in" evaluation)
      expect(user2Data?.attributes).toEqual({});
      expect(user3Data?.attributes).toEqual({});
    });
  });
});

describe("extractAttributeIdsFromQueryValue", () => {
  it("should return empty array for null queryValue", () => {
    const result = extractAttributeIdsFromQueryValue(null);
    expect(result).toEqual([]);
  });

  it("should return empty array for queryValue with no rules", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {},
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual([]);
  });

  it("should extract single attribute ID from a single rule", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-123",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual(["attr-123"]);
  });

  it("should extract multiple attribute IDs from multiple rules", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-123",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
        "rule-2": {
          type: "rule",
          properties: {
            field: "attr-456",
            operator: "select_equals",
            value: ["option-2"],
          },
        },
        "rule-3": {
          type: "rule",
          properties: {
            field: "attr-789",
            operator: "multiselect_some_in",
            value: [["option-3", "option-4"]],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toHaveLength(3);
    expect(result).toContain("attr-123");
    expect(result).toContain("attr-456");
    expect(result).toContain("attr-789");
  });

  it("should deduplicate attribute IDs when same attribute is used in multiple rules", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-123",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
        "rule-2": {
          type: "rule",
          properties: {
            field: "attr-123",
            operator: "select_not_equals",
            value: ["option-2"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual(["attr-123"]);
  });

  it("should extract attribute IDs from nested children1 structures", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "group-1": {
          type: "group",
          children1: {
            "rule-1": {
              type: "rule",
              properties: {
                field: "attr-nested-1",
                operator: "select_equals",
                value: ["option-1"],
              },
            },
          },
        },
        "rule-2": {
          type: "rule",
          properties: {
            field: "attr-top-level",
            operator: "select_equals",
            value: ["option-2"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toHaveLength(2);
    expect(result).toContain("attr-nested-1");
    expect(result).toContain("attr-top-level");
  });

  it("should extract attribute IDs from both queryValue and fallbackQueryValue", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-main",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };
    const fallbackQueryValue = {
      id: "query-2",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-fallback",
            operator: "select_equals",
            value: ["option-2"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue, fallbackQueryValue);
    expect(result).toHaveLength(2);
    expect(result).toContain("attr-main");
    expect(result).toContain("attr-fallback");
  });

  it("should deduplicate attribute IDs across queryValue and fallbackQueryValue", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-shared",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };
    const fallbackQueryValue = {
      id: "query-2",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-shared",
            operator: "select_equals",
            value: ["option-2"],
          },
        },
        "rule-2": {
          type: "rule",
          properties: {
            field: "attr-unique",
            operator: "select_equals",
            value: ["option-3"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue, fallbackQueryValue);
    expect(result).toHaveLength(2);
    expect(result).toContain("attr-shared");
    expect(result).toContain("attr-unique");
  });

  it("should handle queryValue with undefined children1", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual([]);
  });

  it("should handle rules without properties", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual([]);
  });

  it("should handle rules with non-string field values", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: 123,
            operator: "select_equals",
            value: ["option-1"],
          },
        },
        "rule-2": {
          type: "rule",
          properties: {
            field: "valid-attr",
            operator: "select_equals",
            value: ["option-2"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual(["valid-attr"]);
  });

  it("should handle switch_group type queryValue", () => {
    const queryValue = {
      id: "query-1",
      type: "switch_group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-switch",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual(["attr-switch"]);
  });

  it("should handle deeply nested group structures", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "group-1": {
          type: "group",
          children1: {
            "group-2": {
              type: "group",
              children1: {
                "rule-1": {
                  type: "rule",
                  properties: {
                    field: "attr-deep",
                    operator: "select_equals",
                    value: ["option-1"],
                  },
                },
              },
            },
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue);
    expect(result).toEqual(["attr-deep"]);
  });

  it("should handle null fallbackQueryValue", () => {
    const queryValue = {
      id: "query-1",
      type: "group" as const,
      children1: {
        "rule-1": {
          type: "rule",
          properties: {
            field: "attr-main",
            operator: "select_equals",
            value: ["option-1"],
          },
        },
      },
    };
    const result = extractAttributeIdsFromQueryValue(queryValue, null);
    expect(result).toEqual(["attr-main"]);
  });
});
