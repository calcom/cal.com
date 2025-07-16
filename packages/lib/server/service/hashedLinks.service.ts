import { ErrorCode } from "@calcom/lib/errorCodes";
import { validateHashedLinkData } from "@calcom/lib/hashedLinksUtils";
import { prisma, type PrismaClient } from "@calcom/prisma";

import { HashedLinksRepository, type HashedLinkInputType } from "../repository/hashedLinks.repository";

type NormalizedLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number | null;
};

export type EventTypeForTimezone = {
  userId?: number | null;
  teamId?: number | null;
  hosts?: Array<{
    user: {
      timeZone: string | null;
    } | null;
  }> | null;
  profile?: {
    user: {
      timeZone: string | null;
    } | null;
  } | null;
  owner?: {
    timeZone: string | null;
  } | null;
  team?: {
    members?: Array<{
      user?: {
        timeZone: string | null;
      } | null;
    }> | null;
  } | null;
};

export class HashedLinksService {
  private hashedLinksRepository: HashedLinksRepository;

  constructor(private readonly prismaClient: PrismaClient = prisma) {
    this.hashedLinksRepository = new HashedLinksRepository(this.prismaClient);
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
      await this.hashedLinksRepository.deleteLinks(eventTypeId, connectedMultiplePrivateLinks);
      return;
    }

    const normalizedLinks = multiplePrivateLinks.map((input) => this.normalizeLinkInput(input));
    const currentLinks = normalizedLinks.map((l) => l.link);

    const currentLinksSet = new Set(currentLinks);

    const linksToDelete = connectedMultiplePrivateLinks.filter((link) => !currentLinksSet.has(link));
    await this.hashedLinksRepository.deleteLinks(eventTypeId, linksToDelete);

    const existingLinksSet = new Set(connectedMultiplePrivateLinks);

    for (const linkData of normalizedLinks) {
      const exists = existingLinksSet.has(linkData.link);
      if (!exists) {
        await this.hashedLinksRepository.createLink(eventTypeId, linkData);
      } else {
        await this.hashedLinksRepository.updateLink(eventTypeId, linkData);
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

    const hashedLink = await this.hashedLinksRepository.findLinkWithValidationData(linkId);

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
        await this.hashedLinksRepository.incrementUsage(hashedLink.id, hashedLink.maxUsageCount);
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

  /**
   * Extracts the host timezone from event type data
   * @param eventType - Event type data with potential timezone information
   * @returns Host timezone string or null if not found
   */
  public static extractHostTimezone(eventType: EventTypeForTimezone): string | null {
    if (eventType?.userId && eventType?.owner?.timeZone) {
      // Personal event type - use owner's timezone
      return eventType.owner.timeZone;
    } else if (eventType?.teamId) {
      // Team event type - try hosts first, then team members
      if (eventType.hosts && eventType.hosts.length > 0 && eventType.hosts[0]?.user?.timeZone) {
        return eventType.hosts[0].user.timeZone;
      } else if (eventType.team?.members && eventType.team.members.length > 0) {
        return eventType.team.members[0]?.user?.timeZone || null;
      }
    }
    return null;
  }
}
