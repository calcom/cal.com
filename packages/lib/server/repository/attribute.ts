import prisma from "@calcom/prisma";

export class AttributeRepository {
  static async findManyByNames({ attributeNames, orgId }: { attributeNames: string[]; orgId: number }) {
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
}
