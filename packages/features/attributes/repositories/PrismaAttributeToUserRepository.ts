import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/generated/prisma/client";

export class PrismaAttributeToUserRepository {
  constructor(private prismaClient: PrismaClient) {}

  async createManySkipDuplicates(data: Prisma.AttributeToUserCreateManyInput[]) {
    return await this.prismaClient.attributeToUser.createMany({ data, skipDuplicates: true });
  }

  async deleteMany(where: Prisma.AttributeToUserWhereInput) {
    if (Object.keys(where).length === 0) {
      throw new Error("Empty where clause provided to deleteMany. Potential data loss risk.");
    }
    return await this.prismaClient.attributeToUser.deleteMany({ where });
  }

  async findManyIncludeAttribute(where: Prisma.AttributeToUserWhereInput) {
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

  async findManyByOrgMembershipIds({
    orgMembershipIds,
    attributeIds,
  }: {
    orgMembershipIds: number[];
    attributeIds?: string[];
  }) {
    if (!orgMembershipIds.length) {
      return [];
    }

    const attributesAssignedToTeamMembers = await this.prismaClient.attributeToUser.findMany({
      where: {
        memberId: {
          in: orgMembershipIds,
        },
        // Only filter by attribute IDs if provided
        ...(attributeIds?.length && {
          attributeOption: {
            attributeId: {
              in: attributeIds,
            },
          },
        }),
      },
    });

    return attributesAssignedToTeamMembers;
  }
}
