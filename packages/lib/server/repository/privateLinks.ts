import { ErrorCode } from "@calcom/lib/errorCodes";
import { filterActiveLinks, isLinkExpired } from "@calcom/lib/privateLinksUtils";
import { prisma, type PrismaTransaction, type PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export type HashedLinkInputType = {
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
};

type NormalizedLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number | null;
};

export class PrivateLinksRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  private normalizeLinkInput(input: string | HashedLinkInputType): NormalizedLink {
    return typeof input === "string"
      ? { link: input, expiresAt: null }
      : {
          link: input.link,
          expiresAt: input.expiresAt ?? null,
          maxUsageCount: input.maxUsageCount,
        };
  }

  async deleteLinks(eventTypeId: number, linksToDelete: string[], tx?: PrismaTransaction) {
    if (linksToDelete.length === 0) return;

    return await this.prismaClient.hashedLink.deleteMany({
      where: {
        eventTypeId,
        link: { in: linksToDelete },
      },
    });
  }

  async createLink(eventTypeId: number, linkData: NormalizedLink, tx?: PrismaTransaction) {
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

  async updateLink(eventTypeId: number, linkData: NormalizedLink, tx?: PrismaTransaction) {
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

  async handleMultiplePrivateLinks({
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

    const normalizedLinks = multiplePrivateLinks.map((input) => this.normalizeLinkInput(input));
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

  async findLinksByEventTypeId(eventTypeId: number, tx?: PrismaTransaction) {
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

  async findLinkByEventTypeIdAndLink(eventTypeId: number, link: string, tx?: PrismaTransaction) {
    return await this.prismaClient.hashedLink.findFirst({
      where: {
        eventTypeId,
        link,
      },
    });
  }

  async findLinkWithEventTypeDetails(linkId: string, tx?: PrismaTransaction) {
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

  async findLinksWithEventTypeDetails(linkIds: string[], tx?: PrismaTransaction) {
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

  async validateAndIncrementUsage(linkId: string, tx?: PrismaTransaction) {
    const hashedLink = await this.prismaClient.hashedLink.findUnique({
      where: {
        link: linkId,
      },
    });

    if (!hashedLink) {
      throw new Error(ErrorCode.PrivateLinkExpired);
    }

    const now = new Date();
    if (hashedLink.expiresAt && hashedLink.expiresAt < now) {
      throw new Error(ErrorCode.PrivateLinkExpired);
    }

    if (hashedLink.maxUsageCount && hashedLink.maxUsageCount > 0) {
      if (hashedLink.usageCount >= hashedLink.maxUsageCount) {
        throw new Error("Link has expired");
      }

      try {
        await this.prismaClient.hashedLink.update({
          where: {
            id: hashedLink.id,
            usageCount: { lt: hashedLink.maxUsageCount },
          },
          data: {
            usageCount: { increment: 1 },
          },
        });
      } catch (updateError) {
        throw new Error("Link usage limit reached");
      }
    }

    return hashedLink;
  }

  async checkUserPermissionForLink(
    link: { eventType: { teamId?: number | null; userId?: number | null } },
    userId: number,
    tx?: PrismaTransaction
  ): Promise<boolean> {
    if (link.eventType.userId && link.eventType.userId !== userId) return false;
    if (!link.eventType.teamId) return true;

    const membership = await this.prismaClient.membership.findFirst({
      where: {
        teamId: link.eventType.teamId,
        userId,
        accepted: true,
      },
      select: {
        id: true,
      },
    });
    return !!membership;
  }

  // Utility functions moved to @calcom/lib/privateLinksUtils for browser compatibility
  static isLinkExpired = isLinkExpired;
  static filterActiveLinks = filterActiveLinks;
}
