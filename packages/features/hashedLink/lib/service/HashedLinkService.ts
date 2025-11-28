import { MembershipService } from "@calcom/features/membership/services/membershipService";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { validateHashedLinkData } from "@calcom/lib/hashedLinksUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { HashedLinkRepository } from "../repository/HashedLinkRepository";
import { type HashedLinkInputType } from "../repository/HashedLinkRepository";

type NormalizedLink = {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number | null;
};

interface HashedLinkServiceDeps {
  hashedLinkRepository: HashedLinkRepository;
  membershipService: MembershipService;
}

export class HashedLinkService {
  private readonly hashedLinkRepository: HashedLinkRepository;
  private readonly membershipService: MembershipService;

  constructor(deps?: HashedLinkServiceDeps) {
    this.hashedLinkRepository = deps?.hashedLinkRepository ?? HashedLinkRepository.create();
    this.membershipService = deps?.membershipService ?? new MembershipService();
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
      } catch (e) {
        logger.error("Error incrementing usage for hashed link", safeStringify(e));
        throw new Error(ErrorCode.PrivateLinkExpired);
      }
    }

    return hashedLink;
  }

  async findLinkWithDetails(linkId: string) {
    const hashedLink = await this.hashedLinkRepository.findLinkWithDetails(linkId);
    if (!hashedLink) {
      return null;
    }

    return hashedLink;
  }

  async createLinkForEventType(eventTypeId: number, input: string | HashedLinkInputType) {
    const normalized = this.normalizeLinkInput(input);
    return this.hashedLinkRepository.createLink(eventTypeId, normalized);
  }

  async updateLinkForEventType(eventTypeId: number, input: string | HashedLinkInputType) {
    const normalized = this.normalizeLinkInput(input);
    return this.hashedLinkRepository.updateLink(eventTypeId, normalized);
  }

  async deleteLinkForEventType(eventTypeId: number, linkId: string) {
    return this.hashedLinkRepository.deleteLinks(eventTypeId, [linkId]);
  }

  async listLinksByEventType(eventTypeId: number) {
    return this.hashedLinkRepository.findLinksByEventTypeId(eventTypeId);
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
    if (link.eventType.userId) {
      return link.eventType.userId === userId;
    }

    //No user ownership and no team - deny access
    if (!link.eventType.teamId) {
      return false;
    }

    const membership = await this.membershipService.checkMembership(link.eventType.teamId, userId);
    return membership.isMember;
  }
}
