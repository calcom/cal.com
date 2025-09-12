import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaAttributeOptionRepository {
  static async findMany({ orgId }: { orgId: number }) {
    return prisma.attributeOption.findMany({
      where: {
        attribute: {
          teamId: orgId,
        },
      },
      select: {
        id: true,
        value: true,
        slug: true,
        attributeId: true,
      },
    });
  }

  static async createMany({ createManyInput }: { createManyInput: Prisma.AttributeOptionCreateManyInput[] }) {
    const { count } = await prisma.attributeOption.createMany({
      data: createManyInput,
    });

    return {
      count,
    };
  }
}
