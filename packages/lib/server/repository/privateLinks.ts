import prisma, { type PrismaTransaction } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export type HashedLinkInputType = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number;
};

type NormalizedLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number;
};

export class PrivateLinksRepository {
  private static normalizeLinkInput(input: string | HashedLinkInputType): NormalizedLink {
    return typeof input === "string"
      ? { link: input, expiresAt: null }
      : {
          link: input.link,
          expiresAt: input.expiresAt ?? null,
          maxUsageCount: input.maxUsageCount,
        };
  }

  static async deleteLinks(eventTypeId: number, linksToDelete: string[], tx?: PrismaTransaction) {
    if (linksToDelete.length === 0) return;

    const prismaClient = tx ?? prisma;

    return await prismaClient.hashedLink.deleteMany({
      where: {
        eventTypeId,
        link: { in: linksToDelete },
      },
    });
  }

  static async createLink(eventTypeId: number, linkData: NormalizedLink, tx?: PrismaTransaction) {
    const prismaClient = tx ?? prisma;

    const data: Prisma.HashedLinkCreateManyInput = {
      eventTypeId,
      link: linkData.link,
      expiresAt: linkData.expiresAt,
    };

    if (typeof linkData.maxUsageCount === "number") {
      data.maxUsageCount = linkData.maxUsageCount;
    }

    return await prismaClient.hashedLink.create({ data });
  }

  static async updateLink(eventTypeId: number, linkData: NormalizedLink, tx?: PrismaTransaction) {
    const prismaClient = tx ?? prisma;

    const updateData: Prisma.HashedLinkUpdateManyMutationInput = {
      expiresAt: linkData.expiresAt,
    };

    if (typeof linkData.maxUsageCount === "number") {
      updateData.maxUsageCount = linkData.maxUsageCount;
    }

    return await prismaClient.hashedLink.updateMany({
      where: {
        eventTypeId,
        link: linkData.link,
      },
      data: updateData,
    });
  }

  static async handleMultiplePrivateLinks({
    eventTypeId,
    multiplePrivateLinks,
    connectedMultiplePrivateLinks,
    tx,
  }: {
    eventTypeId: number;
    multiplePrivateLinks?: (string | HashedLinkInputType)[];
    connectedMultiplePrivateLinks: string[];
    tx?: PrismaTransaction;
  }) {
    if (!multiplePrivateLinks || multiplePrivateLinks.length === 0) {
      await this.deleteLinks(eventTypeId, connectedMultiplePrivateLinks, tx);
      return;
    }

    const normalizedLinks = multiplePrivateLinks.map(this.normalizeLinkInput);
    const currentLinks = normalizedLinks.map((l) => l.link);

    const linksToDelete = connectedMultiplePrivateLinks.filter((link) => !currentLinks.includes(link));
    await this.deleteLinks(eventTypeId, linksToDelete, tx);

    for (const linkData of normalizedLinks) {
      const exists = connectedMultiplePrivateLinks.includes(linkData.link);
      if (!exists) {
        await this.createLink(eventTypeId, linkData, tx);
      } else {
        await this.updateLink(eventTypeId, linkData, tx);
      }
    }
  }

  static async findLinksByEventTypeId(eventTypeId: number, tx?: PrismaTransaction) {
    const prismaClient = tx ?? prisma;

    return await prismaClient.hashedLink.findMany({
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

  static async findLinkByEventTypeIdAndLink(eventTypeId: number, link: string, tx?: PrismaTransaction) {
    const prismaClient = tx ?? prisma;

    return await prismaClient.hashedLink.findFirst({
      where: {
        eventTypeId,
        link,
      },
    });
  }
}
