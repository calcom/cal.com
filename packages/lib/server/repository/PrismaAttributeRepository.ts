import type { PrismaClient } from "@calcom/prisma";

export class PrismaAttributeRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findManyByNamesAndOrgIdIncludeOptions({
    attributeNames,
    orgId,
  }: {
    attributeNames: string[];
    orgId: number;
  }) {
    return this.prismaClient.attribute.findMany({
      where: {
        name: { in: attributeNames, mode: "insensitive" },
        teamId: orgId,
      },
      include: {
        options: {
          select: {
            id: true,
            value: true,
            slug: true,
          },
        },
      },
    });
  }

  async findManyByOrgId({ orgId }: { orgId: number }) {
    // It should be a faster query because of lesser number of attributes record and index on teamId
    const result = await this.prismaClient.attribute.findMany({
      where: {
        teamId: orgId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        slug: true,
        options: true,
      },
    });

    return result;
  }

  async findAllByOrgIdWithOptions({ orgId }: { orgId: number }) {
    return await this.prismaClient.attribute.findMany({
      where: {
        teamId: orgId,
      },
      include: {
        options: true,
      },
    });
  }

  async findUniqueWithWeights({
    teamId,
    attributeId,
    isWeightsEnabled = true,
  }: {
    teamId: number;
    attributeId: string;
    isWeightsEnabled?: boolean;
  }) {
    return await this.prismaClient.attribute.findUnique({
      where: {
        id: attributeId,
        teamId,
        isWeightsEnabled,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        options: {
          select: {
            id: true,
            value: true,
            slug: true,
            assignedUsers: {
              select: {
                member: {
                  select: {
                    userId: true,
                  },
                },
                weight: true,
              },
            },
          },
        },
      },
    });
  }
}
