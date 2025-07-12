import dayjs from "@calcom/dayjs";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { filterActiveLinks, isLinkExpired } from "@calcom/lib/privateLinksUtils";
import { prisma, type PrismaClient } from "@calcom/prisma";
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

export class HashedLinksRepository {
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

  async deleteLinks(eventTypeId: number, linksToDelete: string[]) {
    if (linksToDelete.length === 0) return;

    return await this.prismaClient.hashedLink.deleteMany({
      where: {
        eventTypeId,
        link: { in: linksToDelete },
      },
    });
  }

  async createLink(eventTypeId: number, linkData: NormalizedLink) {
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

  async updateLink(eventTypeId: number, linkData: NormalizedLink) {
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
  }: {
    eventTypeId: number;
    multiplePrivateLinks?: (string | HashedLinkInputType)[];
    connectedMultiplePrivateLinks: string[];
  }) {
    if (!multiplePrivateLinks || multiplePrivateLinks.length === 0) {
      await this.deleteLinks(eventTypeId, connectedMultiplePrivateLinks);
      return;
    }

    const normalizedLinks = multiplePrivateLinks.map((input) => this.normalizeLinkInput(input));
    const currentLinks = normalizedLinks.map((l) => l.link);

    const linksToDelete = connectedMultiplePrivateLinks.filter((link) => !currentLinks.includes(link));
    await this.deleteLinks(eventTypeId, linksToDelete);

    for (const linkData of normalizedLinks) {
      const exists = connectedMultiplePrivateLinks.includes(linkData.link);
      if (!exists) {
        await this.createLink(eventTypeId, linkData);
      } else {
        await this.updateLink(eventTypeId, linkData);
      }
    }
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

  async validateAndIncrementUsage(linkId: string) {
    const hashedLink = await this.prismaClient.hashedLink.findUnique({
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

    if (!hashedLink) {
      throw new Error(ErrorCode.PrivateLinkExpired);
    }

    // Use host's timezone for expiration comparison
    if (hashedLink.expiresAt) {
      console.log(
        { hashedLink },
        hashedLink.eventType,
        hashedLink.eventType?.profile,
        hashedLink.eventType?.owner
      );
      // Determine timezone based on event type structure
      let hostTimezone: string | null = null;

      if (hashedLink.eventType?.userId && hashedLink.eventType?.owner?.timeZone) {
        // Personal event type - use owner's timezone
        hostTimezone = hashedLink.eventType.owner.timeZone;
      } else if (hashedLink.eventType?.teamId) {
        // Team event type - try hosts first, then team members
        if (hashedLink.eventType.hosts?.length > 0 && hashedLink.eventType.hosts[0]?.user?.timeZone) {
          hostTimezone = hashedLink.eventType.hosts[0].user.timeZone;
        } else if (hashedLink.eventType.team?.members?.length > 0) {
          hostTimezone = hashedLink.eventType.team.members[0]?.user?.timeZone;
        }
      }
      if (hostTimezone) {
        // Use dayjs for timezone-aware comparison
        const now = dayjs().tz(hostTimezone);
        const expiration = dayjs(hashedLink.expiresAt).tz(hostTimezone);

        if (expiration.isBefore(now)) {
          throw new Error(ErrorCode.PrivateLinkExpired);
        }
      } else {
        // Fallback to UTC comparison if no timezone available
        const now = dayjs();
        const expiration = dayjs(hashedLink.expiresAt);

        if (expiration.isBefore(now)) {
          throw new Error(ErrorCode.PrivateLinkExpired);
        }
      }
      return hashedLink;
    }

    if (hashedLink.maxUsageCount && hashedLink.maxUsageCount > 0) {
      if (hashedLink.usageCount >= hashedLink.maxUsageCount) {
        throw new Error(ErrorCode.PrivateLinkExpired);
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
    userId: number
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
