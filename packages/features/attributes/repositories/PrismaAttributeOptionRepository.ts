import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class PrismaAttributeOptionRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findMany({ orgId }: { orgId: number }) {
    return this.prismaClient.attributeOption.findMany({
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

  async createMany({ createManyInput }: { createManyInput: Prisma.AttributeOptionCreateManyInput[] }) {
    const { count } = await this.prismaClient.attributeOption.createMany({
      data: createManyInput,
    });

    return {
      count,
    };
  }
}
