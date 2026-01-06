import type { PrismaClient } from "@calcom/prisma";

type AttributeToUserCreateManyInput = {
  id?: string;
  memberId: number;
  attributeOptionId: string;
  weight?: number;
  createdById: number;
  updatedById: number;
  createdByDSyncId?: string | null;
  updatedByDSyncId?: string | null;
};

type AttributeToUserWhereInput = {
  memberId?: number | { in?: number[] };
  attributeOptionId?: string | { in?: string[] };
};

export class PrismaAttributeToUserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async createManySkipDuplicates(data: AttributeToUserCreateManyInput[]) {
    return await this.prismaClient.attributeToUser.createMany({ data, skipDuplicates: true });
  }

  async deleteMany(where: AttributeToUserWhereInput) {
    if (Object.keys(where).length === 0) {
      throw new Error("Empty where clause provided to deleteMany. Potential data loss risk.");
    }
    return await this.prismaClient.attributeToUser.deleteMany({ where });
  }

  async findManyIncludeAttribute(where: AttributeToUserWhereInput) {
    return await this.prismaClient.attributeToUser.findMany({
      where,
      include: {
        attributeOption: {
          select: {
            attribute: true,
            value: true,
            slug: true,
          },
        },
      },
    });
  }

  async findManyByOrgMembershipIds({ orgMembershipIds }: { orgMembershipIds: number[] }) {
    if (!orgMembershipIds.length) {
      return [];
    }

    const attributesAssignedToTeamMembers = await this.prismaClient.attributeToUser.findMany({
      where: {
        memberId: {
          in: orgMembershipIds,
        },
      },
    });

    return attributesAssignedToTeamMembers;
  }
}
