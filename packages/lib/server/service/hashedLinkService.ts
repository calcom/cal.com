import { ErrorCode } from "@calcom/lib/errorCodes";
import { validateHashedLinkData } from "@calcom/lib/hashedLinksUtils";
import { prisma, type PrismaClient } from "@calcom/prisma";

import { HashedLinkRepository, type HashedLinkInputType } from "../repository/hashedLinkRepository";

type NormalizedLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number | null;
};

export class HashedLinkService {
  private hashedLinkRepository: HashedLinkRepository;

  constructor(private readonly prismaClient: PrismaClient = prisma) {
    this.hashedLinkRepository = new HashedLinkRepository(this.prismaClient);
  }

  /**
   * Normalizes link input to a consistent format
   * @param input - String link or object with link and options
   * @returns Normalized link object
   */
  private normalizeLinkInput(input: string | HashedLinkInputType): NormalizedLink {
    return typeof input === "string"
      ? { link: input, expiresAt: null }
      : {
          link: input.link,
          expiresAt: input.expiresAt ?? null,
          maxUsageCount: input.maxUsageCount,
        };
  }

  /**
   * Handles multiple private links operations - orchestrates create, update, and delete
   * @param eventTypeId - The ID of the event type
   * @param multiplePrivateLinks - Array of links to create/update (can be strings or objects with expiration)
   * @param connectedMultiplePrivateLinks - Array of existing link IDs for this event type
   */
  async handleMultiplePrivateLinks({
    eventTypeId,
    multiplePrivateLinks,
    connectedMultiplePrivateLinks,
  }: {
    eventTypeId: number;
    multiplePrivateLinks?: (string | HashedLinkInputType)[];
    connectedMultiplePrivateLinks: string[];
  }) {
    if (!eventTypeId || eventTypeId <= 0) {
      throw new Error("Invalid event type ID");
    }

    if (!multiplePrivateLinks || multiplePrivateLinks.length === 0) {
      await this.hashedLinkRepository.deleteLinks(eventTypeId, connectedMultiplePrivateLinks);
      return;
    }

    const normalizedLinks = multiplePrivateLinks.map((input) => this.normalizeLinkInput(input));
    const currentLinks = normalizedLinks.map((l) => l.link);

    const currentLinksSet = new Set(currentLinks);

    const linksToDelete = connectedMultiplePrivateLinks.filter((link) => !currentLinksSet.has(link));
    await this.hashedLinkRepository.deleteLinks(eventTypeId, linksToDelete);

    const existingLinksSet = new Set(connectedMultiplePrivateLinks);

    for (const linkData of normalizedLinks) {
      const exists = existingLinksSet.has(linkData.link);
      if (!exists) {
        await this.hashedLinkRepository.createLink(eventTypeId, linkData);
      } else {
        await this.hashedLinkRepository.updateLink(eventTypeId, linkData);
      }
    }
  }

  /**
   * Validates a link without incrementing usage count
   * Handles both time-based and usage-based expiration with timezone awareness
   * @param linkId - The hashed link ID to validate
   * @returns The validated link data
   * @throws Error with ErrorCode.PrivateLinkExpired if link is expired or invalid
   */
  async validate(linkId: string) {
    if (!linkId || typeof linkId !== "string") {
      throw new Error("Invalid link ID");
    }

    const hashedLink = await this.hashedLinkRepository.findLinkWithValidationData(linkId);

    if (!hashedLink) {
      throw new Error(ErrorCode.PrivateLinkExpired);
    }

    validateHashedLinkData(hashedLink);

    return hashedLink;
  }

  /**
   * Validates a link and increments usage count if valid
   * Handles both time-based and usage-based expiration with timezone awareness
   * @param linkId - The hashed link ID to validate
   * @returns The validated link data
   * @throws Error with ErrorCode.PrivateLinkExpired if link is expired or invalid
   */
  async validateAndIncrementUsage(linkId: string) {
    const hashedLink = await this.validate(linkId);
    if (hashedLink.expiresAt) return hashedLink; // Time-based links don't need usage count increment

    if (hashedLink.maxUsageCount && hashedLink.maxUsageCount > 0) {
      try {
        await this.hashedLinkRepository.incrementUsage(hashedLink.id, hashedLink.maxUsageCount);
      } catch (updateError) {
        throw new Error(ErrorCode.PrivateLinkExpired);
      }
    }

    return hashedLink;
  }

  /**
   * Checks if a user has permission to access a link
   * @param link - Link object with event type information
   * @param userId - The user ID to check permissions for
   * @returns true if user has permission, false otherwise
   */
  async checkUserPermissionForLink(
    link: { eventType: { teamId?: number | null; userId?: number | null } },
    userId: number
  ): Promise<boolean> {
    if (!link?.eventType || !userId || userId <= 0) {
      return false;
    }

    // If it's a user event type, check if user owns it
    if (link.eventType.userId && link.eventType.userId !== userId) {
      return false;
    }

    // If it's not a team event, user has permission
    if (!link.eventType.teamId) {
      return true;
    }

    // Check team membership
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
}
