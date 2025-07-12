import { prisma, type PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export type HashedLinkInputType = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
};

export class HashedLinksRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async deleteLinks(eventTypeId: number, linksToDelete: string[]) {
    if (linksToDelete.length === 0) return;

    return await this.prismaClient.hashedLink.deleteMany({
      where: {
        eventTypeId,
        link: { in: linksToDelete },
      },
    });
  }

  async createLink(
    eventTypeId: number,
    linkData: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    const data: Prisma.HashedLinkCreateManyInput = {
      eventTypeId,
      link: linkData.link,
      expiresAt: linkData.expiresAt,
    };

    if (linkData.maxUsageCount && Number.isFinite(linkData.maxUsageCount)) {
      data.maxUsageCount = linkData.maxUsageCount;
    }

    return await this.prismaClient.hashedLink.create({ data });
  }

  async updateLink(
    eventTypeId: number,
    linkData: { link: string; expiresAt: Date | null; maxUsageCount?: number | null }
  ) {
    const updateData: Prisma.HashedLinkUpdateManyMutationInput = {
      expiresAt: linkData.expiresAt,
    };

    if (typeof linkData.maxUsageCount === "number" && linkData.maxUsageCount !== null) {
      updateData.maxUsageCount = linkData.maxUsageCount;
    }

    return await this.prismaClient.hashedLink.updateMany({
      where: {
        eventTypeId,
        link: linkData.link,
      },
      data: updateData,
    });
  }

  async findLinksByEventTypeId(eventTypeId: number) {
    return await this.prismaClient.hashedLink.findMany({
      where: {
        eventTypeId,
      },
      select: {
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
      },
    });
  }

  async findLinkByEventTypeIdAndLink(eventTypeId: number, link: string) {
    return await this.prismaClient.hashedLink.findFirst({
      where: {
        eventTypeId,
        link,
      },
    });
  }

  async findLinkWithEventTypeDetails(linkId: string) {
    return await this.prismaClient.hashedLink.findUnique({
      where: {
        link: linkId,
      },
      select: {
        id: true,
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventTypeId: true,
        eventType: {
          select: {
            teamId: true,
            userId: true,
          },
        },
      },
    });
  }

  async findLinksWithEventTypeDetails(linkIds: string[]) {
    return await this.prismaClient.hashedLink.findMany({
      where: {
        link: {
          in: linkIds,
        },
      },
      select: {
        id: true,
        link: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventTypeId: true,
        eventType: {
          select: {
            teamId: true,
            userId: true,
          },
        },
      },
    });
  }

  async findLinkWithValidationData(linkId: string) {
    return await this.prismaClient.hashedLink.findUnique({
      where: {
        link: linkId,
      },
      select: {
        id: true,
        expiresAt: true,
        maxUsageCount: true,
        usageCount: true,
        eventType: {
          select: {
            userId: true,
            teamId: true,
            hosts: {
              select: {
                user: {
                  select: {
                    timeZone: true,
                  },
                },
              },
            },
            profile: {
              select: {
                user: {
                  select: {
                    timeZone: true,
                  },
                },
              },
            },
            owner: {
              select: {
                timeZone: true,
              },
            },
          },
        },
      },
    });
  }

  async incrementUsage(linkId: number, maxUsageCount: number) {
    return await this.prismaClient.hashedLink.update({
      where: {
        id: linkId,
        usageCount: { lt: maxUsageCount },
      },
      data: {
        usageCount: { increment: 1 },
      },
    });
  }
}
