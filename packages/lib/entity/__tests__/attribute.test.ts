import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, vi, beforeEach } from "vitest";

import prisma from "@calcom/prisma";
import type { AttributeOption } from "@calcom/prisma/client";
import { AttributeType, MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../../server/repository/membership";
import { attribute, setValueForMember } from "../attribute";

// vi.mock("@calcom/prisma", () => ({
//   default: {
//     attribute: {
//       findMany: vi.fn(),
//     },
//     attributeToUser: {
//       createMany: vi.fn(),
//     },
//   },
// }));

// vi.mock("../../server/repository/membership", () => ({
//   MembershipRepository: {
//     findFirstByUserIdAndTeamId: vi.fn(),
//   },
// }));

function buildMockAttribute(data: {
  teamId: number;
  id: string;
  type: AttributeType;
  name: string;
  slug: string;
}) {
  return {
    usersCanEditRelation: true,
    isWeightsEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    isLocked: false,
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

describe("setValueForMember", () => {
  const orgId = 1001;
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.only("should correctly identify attribute and attribute options by name and set them", async () => {
    await createMockAttribute({
      teamId: orgId,
      id: "1",
      name: "department",
      slug: "department-slug",
      type: AttributeType.SINGLE_SELECT,
      options: [
        { id: "101", value: "engineering", slug: "engineering-slug" },
        { id: "102", value: "sales", slug: "sales-slug" },
      ],
    });

    const { membership } = await createMockUserWithMembership({ orgId });

    await setValueForMember({
      orgId,
      memberId: membership.id,
      attributeLabelToValueMap: {
        Department: "Sales",
      },
    });

    const createdAttributeToUsers = await prisma.attributeToUser.findMany({
      where: {
        memberId: membership.id,
      },
    });

    expect(createdAttributeToUsers).toHaveLength(1);
    expect(createdAttributeToUsers[0].attributeOptionId).toEqual("102");

    await setValueForMember({
      orgId,
      memberId: membership.id,
      attributeLabelToValueMap: {
        Department: "Engineering",
      },
    });

    expect(createdAttributeToUsers).toHaveLength(1);
    expect(createdAttributeToUsers[0].attributeOptionId).toEqual("102");
  });

  it("should return 0 when user is not a member of org", async () => {
    vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue(null);

    const result = await attribute.setOptionsForUser({
      orgId: 456,
      userId: 123,
      attributeLabelToOptionLabelMap: {
        Department: "Engineering",
      },
    });

    expect(result).toEqual({ numOfAttributeOptionsSet: 0 });
    expect(prisma.attributeToUser.createMany).not.toHaveBeenCalled();
  });

  it("should handle non-existent attributes", async () => {
    vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
      id: 1,
      userId: 123,
      teamId: 456,
    });

    vi.mocked(prisma.attribute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.attributeToUser.createMany).mockResolvedValue({ count: 0 });

    const result = await attribute.setOptionsForUser({
      orgId: 456,
      userId: 123,
      attributeLabelToOptionLabelMap: {
        NonExistentAttribute: "SomeValue",
      },
    });

    expect(result).toEqual({ numOfAttributeOptionsSet: 0 });
    expect(prisma.attributeToUser.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });

  it("should handle non-existent options for existing attributes", async () => {
    vi.mocked(MembershipRepository.findFirstByUserIdAndTeamId).mockResolvedValue({
      id: 1,
      userId: 123,
      teamId: 456,
    });

    vi.mocked(prisma.attribute.findMany).mockResolvedValue([
      {
        id: 1,
        name: "Department",
        slug: "department",
        enabled: true,
        teamId: 456,
        options: [{ id: 101, value: "Engineering", slug: "engineering" }],
      },
    ]);

    vi.mocked(prisma.attributeToUser.createMany).mockResolvedValue({ count: 0 });

    const result = await attribute.setOptionsForUser({
      orgId: 456,
      userId: 123,
      attributeLabelToOptionLabelMap: {
        Department: "NonExistentOption",
      },
    });

    expect(result).toEqual({ numOfAttributeOptionsSet: 0 });
    expect(prisma.attributeToUser.createMany).toHaveBeenCalledWith({
      data: [],
    });
  });
});
