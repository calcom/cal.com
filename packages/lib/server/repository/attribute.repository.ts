import prisma from "@calcom/prisma";

export class AttributeRepository {
  static async findManyByNamesAndOrgIdIncludeOptions({
    attributeNames,
    orgId,
  }: {
    attributeNames: string[];
    orgId: number;
  }) {
    return prisma.attribute.findMany({
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

  static async findManyByOrgId({ orgId }: { orgId: number }) {
    // It should be a faster query because of lesser number of attributes record and index on teamId
    const result = await prisma.attribute.findMany({
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

  static async findAllByOrgIdWithOptions({ orgId }: { orgId: number }) {
    return await prisma.attribute.findMany({
      where: {
        teamId: orgId,
      },
      include: {
        options: true,
      },
    });
  }
}
