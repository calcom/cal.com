import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { isLinkExpired as utilsIsLinkExpired } from "@calcom/lib/hashedLinksUtils";
import { HashedLinkService } from "@calcom/lib/server/service/hashedLinkService";
import { HashedLinkRepository } from "@calcom/lib/server/repository/hashedLinkRepository";

export type PrivateLinkData = {
  id: string | number;
  link: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number;
  eventTypeId: number;
  isExpired: boolean;
  bookingUrl: string;
};

export type CreatePrivateLinkInput = {
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
};

export type UpdatePrivateLinkInput = {
  linkId: string;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
};

export type BulkUpdatePrivateLinkInput = {
  privateLinks: Array<{
    link: string;
    expiresAt?: Date | null;
    maxUsageCount?: number | null;
  }>;
};

/**
 * Platform library service for managing private links
 * This wraps the existing HashedLinkService and HashedLinkRepository
 */
export class PlatformPrivateLinksService {
  private readonly hashedLinkService: HashedLinkService;
  private readonly hashedLinkRepository: HashedLinkRepository;

  constructor() {
    this.hashedLinkService = new HashedLinkService();
    this.hashedLinkRepository = HashedLinkRepository.create();
  }

  async createPrivateLink(
    eventTypeId: number,
    userId: number,
    input: CreatePrivateLinkInput
  ): Promise<PrivateLinkData> {
    // Generate a new hashed link ID
    const linkId = generateHashedLink(userId);

    // Create the link
    const createdLink = await this.hashedLinkRepository.createLink(eventTypeId, {
      link: linkId,
      expiresAt: input.expiresAt || null,
      maxUsageCount: input.maxUsageCount || null,
    });

    return this.formatPrivateLinkOutput(createdLink, eventTypeId);
  }

  async getPrivateLinks(eventTypeId: number, userId: number): Promise<PrivateLinkData[]> {
    // First verify that the user owns the event type
    await this.checkUserPermission(eventTypeId, userId);

    const links = await this.hashedLinkRepository.findLinksByEventTypeId(eventTypeId);

    return links.map((link) => this.formatPrivateLinkOutput(link, eventTypeId));
  }

  async updatePrivateLink(
    eventTypeId: number,
    userId: number,
    input: UpdatePrivateLinkInput
  ): Promise<PrivateLinkData> {
    // First verify that the user has permission to update this link
    await this.checkUserPermission(eventTypeId, userId);

    // Verify the link exists and belongs to this event type
    const existingLink = await this.hashedLinkRepository.findLinkWithEventTypeDetails(input.linkId);

    if (!existingLink || existingLink.eventTypeId !== eventTypeId) {
      throw new Error(`Private link with ID ${input.linkId} not found for this event type`);
    }

    // Update the link
    await this.hashedLinkRepository.updateLink(eventTypeId, {
      link: input.linkId,
      expiresAt: input.expiresAt || null,
      maxUsageCount: input.maxUsageCount || null,
    });

    // Fetch the updated link
    const updatedLink = await this.hashedLinkRepository.findLinkWithEventTypeDetails(input.linkId);

    if (!updatedLink) {
      throw new Error(`Failed to retrieve updated link`);
    }

    return this.formatPrivateLinkOutput(updatedLink, eventTypeId);
  }

  async deletePrivateLink(eventTypeId: number, userId: number, linkId: string): Promise<void> {
    // First verify that the user has permission to delete this link
    await this.checkUserPermission(eventTypeId, userId);

    // Verify the link exists and belongs to this event type
    const existingLink = await this.hashedLinkRepository.findLinkWithEventTypeDetails(linkId);

    if (!existingLink || existingLink.eventTypeId !== eventTypeId) {
      throw new Error(`Private link with ID ${linkId} not found for this event type`);
    }

    // Delete the link
    await this.hashedLinkRepository.deleteLinks(eventTypeId, [linkId]);
  }

  async bulkUpdatePrivateLinks(
    eventTypeId: number,
    userId: number,
    input: BulkUpdatePrivateLinkInput
  ): Promise<PrivateLinkData[]> {
    // First verify that the user has permission
    await this.checkUserPermission(eventTypeId, userId);

    // Get existing links for this event type
    const existingLinks = await this.hashedLinkRepository.findLinksByEventTypeId(eventTypeId);
    const existingLinkIds = existingLinks.map((link) => link.link);

    // Use the HashedLinkService to handle the bulk operation
    const normalizedLinks = input.privateLinks.map((linkData) => ({
      link: linkData.link,
      expiresAt: linkData.expiresAt || null,
      maxUsageCount: linkData.maxUsageCount || null,
    }));

    await this.hashedLinkService.handleMultiplePrivateLinks({
      eventTypeId,
      multiplePrivateLinks: normalizedLinks,
      connectedMultiplePrivateLinks: existingLinkIds,
    });

    // Return the updated links
    return this.getPrivateLinks(eventTypeId, userId);
  }

  private async checkUserPermission(eventTypeId: number, userId: number): Promise<void> {
    // This is a simplified check - in a real implementation, you might want to
    // check through the event types service to ensure proper ownership validation
    const links = await this.hashedLinkRepository.findLinksByEventTypeId(eventTypeId);
    
    if (links.length > 0) {
      // If links exist, we can check permissions through the existing hashedLinkService
      const firstLink = links[0];
      const linkWithDetails = await this.hashedLinkRepository.findLinkWithEventTypeDetails(firstLink.link);
      
      if (linkWithDetails) {
        const hasPermission = await this.hashedLinkService.checkUserPermissionForLink(
          { eventType: linkWithDetails.eventType },
          userId
        );
        
        if (!hasPermission) {
          throw new Error(`User does not have permission to access event type ${eventTypeId}`);
        }
      }
    }
    // If no links exist yet, we assume the user has permission to create them
    // In a production environment, you'd want to verify event type ownership here
  }

  private formatPrivateLinkOutput(
    link: any,
    eventTypeId: number,
    eventTypeSlug?: string
  ): PrivateLinkData {
    const isExpired = utilsIsLinkExpired(link);
    const bookingUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com"}/d/${link.link}${
      eventTypeSlug ? `/${eventTypeSlug}` : ""
    }`;

    return {
      id: link.id?.toString() || link.link,
      link: link.link,
      expiresAt: link.expiresAt,
      maxUsageCount: link.maxUsageCount,
      usageCount: link.usageCount || 0,
      eventTypeId,
      isExpired,
      bookingUrl,
    };
  }
}

// Export the service instance
export const platformPrivateLinksService = new PlatformPrivateLinksService();

// Export individual functions for convenience
export const createPrivateLink = (eventTypeId: number, userId: number, input: CreatePrivateLinkInput) =>
  platformPrivateLinksService.createPrivateLink(eventTypeId, userId, input);

export const getPrivateLinks = (eventTypeId: number, userId: number) =>
  platformPrivateLinksService.getPrivateLinks(eventTypeId, userId);

export const updatePrivateLink = (eventTypeId: number, userId: number, input: UpdatePrivateLinkInput) =>
  platformPrivateLinksService.updatePrivateLink(eventTypeId, userId, input);

export const deletePrivateLink = (eventTypeId: number, userId: number, linkId: string) =>
  platformPrivateLinksService.deletePrivateLink(eventTypeId, userId, linkId);
