import prismock from "@calcom/testing/lib/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@calcom/prisma";
import type { AttributeOption } from "@calcom/prisma/client";
import { AttributeType, MembershipRole } from "@calcom/prisma/enums";

import { assignValueToUserInOrgBulk, buildPrismaQueriesForAttributeOptionToUser } from "./assignValueToUser";

function buildMockAttribute(data: {
  teamId: number;
  id: string;
  type: AttributeType;
  name: string;
  slug: string;
  isLocked: boolean;
}) {
  return {
    usersCanEditRelation: true,
    isWeightsEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    enabled: true,
    ...data,
  };
}

async function createMockAttribute({
  options,
  ...attributeData
}: Parameters<typeof buildMockAttribute>[0] & {
  options: Pick<AttributeOption, "id" | "value" | "slug">[];
}) {
  const attribute = await prismock.attribute.create({ data: buildMockAttribute(attributeData) });
  const attributeOptions = await prismock.attributeOption.createMany({
    data: options.map((option) => ({
      ...option,
      attributeId: attribute.id,
    })),
  });
  return {
    attribute,
    attributeOptions,
  };
}

async function createMockUserWithMembership({ orgId }: { orgId: number }) {
  const user = await prismock.user.create({
    data: {
      name: "Test User",
      email: "test@test.com",
    },
  });
  const membership = await prismock.membership.create({
    data: {
      createdAt: new Date(),
      role: MembershipRole.MEMBER,
      disableImpersonation: false,
      accepted: true,
      teamId: orgId,
      userId: user.id,
    },
  });
  return {
    user: user,
    membership: membership,
  };
}

async function createMockDSyncData({
  directoryId,
  tenant,
  organizationId,
}: {
  directoryId: string;
  tenant: string;
  organizationId: number;
}) {
  return prismock.dSyncData.create({
    data: {
      directoryId,
      tenant,
      organizationId,
    },
  });
}

async function createMockAssignment({
  membershipId,
  attributeOptionId,
  dsyncId,
}: {
  membershipId: number;
  attributeOptionId: string;
  orgId: number;
  dsyncId: string | null;
}) {
  let dsync;
  if (dsyncId) {
    dsync = await prismock.dSyncData.findUnique({
      where: {
        id: dsyncId as unknown as number,
      },
    });
  }

  const attributeToUser = await prismock.attributeToUser.create({
    data: {
      memberId: membershipId,
      attributeOptionId,
      createdByDSyncId: dsync ? (dsync.id as unknown as string) : null,
    },
  });

  return {
    attributeToUser,
    dsync,
  };
}

describe("addValueForMember", () => {
  const orgId = 1001;
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Misc", () => {
    let dsyncDoingAssignment_id: string;
    beforeEach(async () => {
      const dsync = await createMockDSyncData({
        directoryId: "1",
        tenant: "testorg-000",
        organizationId: orgId,
      });
      dsyncDoingAssignment_id = dsync.id as unknown as string;
    });

    it("should correctly identify attribute and attribute options by name and set them", async () => {
      await createMockAttribute({
        teamId: orgId,
        id: "1",
        name: "department",
        slug: "department-slug",
        type: AttributeType.SINGLE_SELECT,
        isLocked: true,
        options: [
          { id: "101", value: "engineering", slug: "engineering-slug" },
          { id: "102", value: "sales", slug: "sales-slug" },
        ],
      });

      const { user, membership } = await createMockUserWithMembership({ orgId });

      await assignValueToUserInOrgBulk({
        orgId,
        userId: user.id,
        attributeLabelToValueMap: {
          Department: "Sales",
        },
        updater: {
          userId: 999,
        },
      });

      const createdAttributeToUsers = await prisma.attributeToUser.findMany({
        where: {
          memberId: membership.id,
        },
      });

      expect(createdAttributeToUsers).toHaveLength(1);
      expect(createdAttributeToUsers[0].attributeOptionId).toEqual("102");

      // Do another update. This should reset the options assigned to the user and add just this one
      await assignValueToUserInOrgBulk({
        orgId,
        userId: user.id,
        attributeLabelToValueMap: {
          Department: "engineering",
        },
        updater: {
          userId: 999,
        },
      });

      const createdAttributeToUsers2 = await prisma.attributeToUser.findMany({
        where: {
          memberId: membership.id,
        },
      });

      expect(createdAttributeToUsers2).toHaveLength(1);
      expect(createdAttributeToUsers2[0].attributeOptionId).toEqual("101");
    });

    it("should allow setting an array of strings as a value for a multi-select attribute", async () => {
      await createMockAttribute({
        teamId: orgId,
        id: "1",
        name: "department",
        slug: "department-slug",
        type: AttributeType.MULTI_SELECT,
        isLocked: true,
        options: [
          { id: "101", value: "engineering", slug: "engineering-slug" },
          { id: "102", value: "sales", slug: "sales-slug" },
          { id: "103", value: "marketing", slug: "marketing-slug" },
        ],
      });

      const { user, membership } = await createMockUserWithMembership({ orgId });
      // In Cal.com user created pool
      await createMockAssignment({
        orgId,
        membershipId: membership.id,
        // Sales
        attributeOptionId: "102",
        dsyncId: null,
      });

      await assignValueToUserInOrgBulk({
        orgId,
        userId: user.id,
        attributeLabelToValueMap: {
          Department: ["marketing", "engineering", "unknown"],
        },
        // Setting value using the same dsyncId that was used to create the option in SCIM Pool
        updater: {
          dsyncId: dsyncDoingAssignment_id,
        },
      });

      const attributeToUsers = await prisma.attributeToUser.findMany({
        where: {
          memberId: membership.id,
        },
      });

      expect(attributeToUsers).toHaveLength(2);
      expect(attributeToUsers[0].attributeOptionId).toEqual("103");
      expect(attributeToUsers[1].attributeOptionId).toEqual("101");
    });
  });

  describe("Locked Attribute(Source of Truth - Dsync)", () => {
    const isLocked = true;
    describe("Update from SCIM", async () => {
      let dsyncDoingAssignment_id: string;
      beforeEach(async () => {
        const dsync = await createMockDSyncData({
          directoryId: "1",
          tenant: "testorg-000",
          organizationId: orgId,
        });
        dsyncDoingAssignment_id = dsync.id as unknown as string;
      });

      it("should reset all the options(Multi-Select) in all the SCIM Pools and Cal.com User Pool", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.MULTI_SELECT,
          isLocked,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });
        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        // In SCIM dsync-1 Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "101",
          dsyncId: dsyncDoingAssignment_id,
        });

        const dsync2 = await createMockDSyncData({
          directoryId: "2",
          tenant: "testorg-000",
          organizationId: orgId,
        });

        // In SCIM dsync-2 Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "101",
          dsyncId: dsync2!.id as unknown as string,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "marketing",
          },
          // Setting value using the same dsyncId that was used to create the option in SCIM Pool
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(attributeToUsers).toHaveLength(1);
        // Cal.com User Pool - Intact
        expect(attributeToUsers[0].attributeOptionId).toEqual("103");
      });

      it("should allow setting an array of strings as a value for a multi-select attribute", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.MULTI_SELECT,
          isLocked,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });
        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        // In SCIM dsync-1 Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "101",
          dsyncId: dsyncDoingAssignment_id,
        });

        const dsync2 = await createMockDSyncData({
          directoryId: "2",
          tenant: "testorg-000",
          organizationId: orgId,
        });

        // In SCIM dsync-2 Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "101",
          dsyncId: dsync2!.id as unknown as string,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: ["marketing", "engineering"],
          },
          // Setting value using the same dsyncId that was used to create the option in SCIM Pool
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(attributeToUsers).toHaveLength(2);
        expect(attributeToUsers[0].attributeOptionId).toEqual("103");
        expect(attributeToUsers[1].attributeOptionId).toEqual("101");
      });

      it("should not recreate an assignment that already exists", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.SINGLE_SELECT,
          isLocked,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        const beforeAssignments = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "Sales",
          },
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const afterAssignments = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(afterAssignments).toHaveLength(1);
        expect(afterAssignments[0].attributeOptionId).toEqual("102");
        expect(beforeAssignments[0].id).toEqual(afterAssignments[0].id);
        expect(beforeAssignments[0].createdByDSyncId).toEqual(afterAssignments[0].createdByDSyncId);
        expect(afterAssignments[0].updatedByDSyncId).toEqual(dsyncDoingAssignment_id);
      });

      it("should be able to set a value for TEXT(non-enum) attribute that already has an option set by Cal.com user", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.TEXT,
          isLocked,
          options: [{ id: "102", value: "sales", slug: "sales-slug" }],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // "Sales" Option set by cal.com user
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "not-already-an-option",
          },
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
          select: {
            attributeOption: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        });

        expect(attributeToUsers).toHaveLength(1);
        expect(attributeToUsers[0].attributeOption.value).toEqual("not-already-an-option");
      });

      it.skip("should only delete the assignments for the user that is being pushed", async () => {
        // TODO
      });
    });
  });

  describe("Unlocked Attribute", () => {
    const isLocked = false;
    describe("Update from SCIM", () => {
      let dsyncDoingAssignment_id: string;
      beforeEach(async () => {
        const dsync = await createMockDSyncData({
          directoryId: "1",
          tenant: "testorg-000",
          organizationId: orgId,
        });
        dsyncDoingAssignment_id = dsync.id as unknown as string;
      });

      it("should reset the options(Multi-Select) in the SCIM Pool only and keep Cal.com User Pool options intact when assignValueToUserInOrgBulk is from SCIM", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.MULTI_SELECT,
          isLocked,
          options: [
            { id: "scim-101", value: "engineering", slug: "engineering-slug" },
            { id: "calcom-102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });
        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "calcom-102",
          dsyncId: null,
        });

        // In SCIM Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "scim-101",
          dsyncId: dsyncDoingAssignment_id,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "marketing",
          },
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(attributeToUsers).toHaveLength(2);
        // Cal.com User Pool - Intact
        expect(attributeToUsers[0].attributeOptionId).toEqual("calcom-102");
        // SCIM Pool - Previous value removed
        expect(attributeToUsers[1].attributeOptionId).toEqual("103");
      });

      it("should not be able to set a value for single-select attribute that already has an option set by Cal.com user", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.SINGLE_SELECT,
          isLocked,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // "Sales" Option set by cal.com user
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        const dsync = await createMockDSyncData({
          directoryId: "1",
          tenant: "testorg-000",
          organizationId: orgId,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "engineering",
          },
          updater: {
            dsyncId: dsync.id as unknown as string,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
          select: {
            attributeOption: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        });

        expect(attributeToUsers).toHaveLength(1);
        expect(attributeToUsers[0].attributeOption.value).toEqual("sales");
        expect(attributeToUsers[0].attributeOption.id).toEqual("102");
      });

      it("should not be able to set a value for TEXT(non-enum) attribute that already has an option set by Cal.com user", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.TEXT,
          isLocked,
          options: [{ id: "102", value: "sales", slug: "sales-slug" }],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // "Sales" Option set by cal.com user
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        const dsync = await createMockDSyncData({
          directoryId: "1",
          tenant: "testorg-000",
          organizationId: orgId,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "not-already-an-option",
          },
          updater: {
            dsyncId: dsync.id as unknown as string,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
          select: {
            attributeOption: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        });

        expect(attributeToUsers).toHaveLength(1);
        expect(attributeToUsers[0].attributeOption.value).toEqual("sales");
        expect(attributeToUsers[0].attributeOption.id).toEqual("102");
      });

      it("should not recreate an assignment that already exists", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.SINGLE_SELECT,
          isLocked,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        const beforeAssignments = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "Sales",
          },
          updater: {
            dsyncId: dsyncDoingAssignment_id,
          },
        });

        const afterAssignments = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(afterAssignments).toHaveLength(1);
        expect(afterAssignments[0].attributeOptionId).toEqual("102");
        expect(beforeAssignments[0].id).toEqual(afterAssignments[0].id);
      });

      it.skip("should only delete the assignments for the user that is being pushed", async () => {
        // TODO
      });
    });

    describe("Update from Cal.com", () => {
      const userDoingAssignment_id = 999;
      it("should reset the options(Multi-Select) in the Cal.com User Pool only and keep SCIM Pool options intact when assignValueToUserInOrgBulk is from Cal.com User Pool", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.MULTI_SELECT,
          isLocked: false,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });

        // In Cal.com user created pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Sales
          attributeOptionId: "102",
          dsyncId: null,
        });

        const dsync = await createMockDSyncData({
          directoryId: "1",
          tenant: "testorg-000",
          organizationId: orgId,
        });

        // In SCIM Pool
        await createMockAssignment({
          orgId,
          membershipId: membership.id,
          // Engineering
          attributeOptionId: "101",
          dsyncId: dsync.id,
        });

        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "marketing",
          },
          updater: {
            userId: userDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
        });

        expect(attributeToUsers).toHaveLength(2);

        // Cal.com User Pool - Previous value removed and new value added
        expect(attributeToUsers[1].attributeOptionId).toEqual("103");
      });

      it("should not be able to assign values beyond the options for SINGLE_SELECT(enum based) attribute", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.SINGLE_SELECT,
          isLocked: false,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });
        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "not-already-an-option",
          },
          updater: {
            userId: userDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
          select: {
            attributeOption: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        });

        expect(attributeToUsers).toHaveLength(0);
      });

      it("should be able to assign values beyond the options for TEXT(non-enum) attribute", async () => {
        await createMockAttribute({
          teamId: orgId,
          id: "1",
          name: "department",
          slug: "department-slug",
          type: AttributeType.TEXT,
          isLocked: false,
          options: [
            { id: "101", value: "engineering", slug: "engineering-slug" },
            { id: "102", value: "sales", slug: "sales-slug" },
            { id: "103", value: "marketing", slug: "marketing-slug" },
          ],
        });

        const { user, membership } = await createMockUserWithMembership({ orgId });
        await assignValueToUserInOrgBulk({
          orgId,
          userId: user.id,
          attributeLabelToValueMap: {
            Department: "not-already-an-option",
          },
          updater: {
            userId: userDoingAssignment_id,
          },
        });

        const attributeToUsers = await prisma.attributeToUser.findMany({
          where: {
            memberId: membership.id,
          },
          select: {
            attributeOption: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        });

        expect(attributeToUsers).toHaveLength(1);
        expect(attributeToUsers[0].attributeOption.value).toEqual("not-already-an-option");
      });

      it.skip("should only delete the assignments for the user that is being pushed", async () => {
        // TODO
      });
    });
  });
});

describe("buildPrismaQueriesForAttributeOptionToUser", () => {
  describe("when building queries for attribute option to user", () => {
    const mockCreator = { userId: 123 };
    const mockMemberId = 456;
    const mockOrgId = 789;

    it("should not return any queries when there are no assignments", () => {
      const result = buildPrismaQueriesForAttributeOptionToUser({
        orgId: mockOrgId,
        memberId: mockMemberId,
        existingAttributeOptionAssignments: [],
        attributeOptionsToAssign: [],
        updater: mockCreator,
      });

      expect(result.attributeToUserCreateManyInput).toHaveLength(0);
      expect(result.attributeToUserUpdateManyInput).toBeNull();
      expect(result.attributeToUserDeleteQueries.locked).toBeNull();
      expect(result.attributeToUserDeleteQueries.unlocked).toEqual(null);
    });

    it("should create new assignments for new options", () => {
      const attributeOptionsToAssign = [
        {
          attribute: { id: "attr1", isLocked: false },
          optionsToAssign: [{ id: "opt1", label: "Option 1" }],
        },
      ];

      const result = buildPrismaQueriesForAttributeOptionToUser({
        orgId: mockOrgId,
        memberId: mockMemberId,
        existingAttributeOptionAssignments: [],
        attributeOptionsToAssign,
        updater: mockCreator,
      });

      expect(result.attributeToUserCreateManyInput).toHaveLength(1);
      expect(result.attributeToUserCreateManyInput[0]).toEqual({
        memberId: mockMemberId,
        attributeOptionId: "opt1",
        createdById: mockCreator.userId,
        createdByDSyncId: null,
      });

      expect(result.attributeToUserUpdateManyInput).toBeNull();
      expect(result.attributeToUserDeleteQueries.locked).toBeNull();
      expect(result.attributeToUserDeleteQueries.unlocked).toBeNull();
    });

    it("should handle locked attributes correctly", () => {
      const attributeOptionsToAssign = [
        {
          attribute: { id: "attr1", isLocked: true },
          optionsToAssign: [{ id: "opt1", label: "Option 1" }],
        },
      ];

      const result = buildPrismaQueriesForAttributeOptionToUser({
        orgId: mockOrgId,
        memberId: mockMemberId,
        existingAttributeOptionAssignments: [],
        attributeOptionsToAssign,
        updater: mockCreator,
      });

      expect(result.attributeToUserDeleteQueries.locked).toEqual({
        memberId: mockMemberId,
        attributeOption: {
          attribute: {
            id: {
              in: ["attr1"],
            },
          },
        },
      });
    });

    it("should update existing assignments with same values", () => {
      const existingAssignments = [
        {
          id: "assign1",
          attributeOption: {
            label: "APAC",
            attribute: { id: "territory" },
          },
        },
      ] as any;

      const attributeOptionsToAssign = [
        {
          attribute: { id: "territory", isLocked: false },
          optionsToAssign: [{ id: "1", label: "ApAc" }],
        },
      ];

      const result = buildPrismaQueriesForAttributeOptionToUser({
        orgId: mockOrgId,
        memberId: mockMemberId,
        existingAttributeOptionAssignments: existingAssignments,
        attributeOptionsToAssign,
        updater: mockCreator,
      });

      expect(result.attributeToUserUpdateManyInput).toEqual({
        where: {
          memberId: mockMemberId,
          id: { in: ["assign1"] },
        },
        data: {
          updatedById: mockCreator.userId,
          updatedByDSyncId: null,
        },
      });
    });
  });
});
