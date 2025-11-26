import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaAttributeToUserRepository {
  static async createManySkipDuplicates(data: Prisma.AttributeToUserCreateManyInput[]) {
    return await prisma.attributeToUser.createMany({ data, skipDuplicates: true });
  }

  static async deleteMany(where: Prisma.AttributeToUserWhereInput) {
    if (Object.keys(where).length === 0) {
      throw new Error("Empty where clause provided to deleteMany. Potential data loss risk.");
    }
    return await prisma.attributeToUser.deleteMany({ where });
  }

  static async findManyIncludeAttribute(where: Prisma.AttributeToUserWhereInput) {
    return await prisma.attributeToUser.findMany({
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

  static async findManyByOrgMembershipIds({ orgMembershipIds }: { orgMembershipIds: number[] }) {
    if (!orgMembershipIds.length) {
      return [];
    }

    const attributesAssignedToTeamMembers = await prisma.attributeToUser.findMany({
      where: {
        memberId: {
          in: orgMembershipIds,
        },
      },
    });

    return attributesAssignedToTeamMembers;
  }
}
