import type { Prisma } from "@prisma/client";

import kysely from "@calcom/kysely";
import prisma from "@calcom/prisma";

export class AttributeToUserRepository {
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

  static async findManyByOrgAndTeamIds({ orgId, teamId }: { orgId: number; teamId: number }) {
    return await kysely
      .selectFrom("AttributeToUser")
      .innerJoin("Membership", "Membership.id", "AttributeToUser.memberId")
      .select([
        "AttributeToUser.id",
        "AttributeToUser.memberId",
        "AttributeToUser.attributeOptionId",
        "AttributeToUser.weight",
        "AttributeToUser.createdAt",
        "AttributeToUser.createdById",
        "AttributeToUser.createdByDSyncId",
        "AttributeToUser.updatedAt",
        "AttributeToUser.updatedById",
        "AttributeToUser.updatedByDSyncId",
      ])
      .where("Membership.teamId", "in", [orgId, teamId])
      .where("Membership.accepted", "=", true)
      .execute();
  }
}
