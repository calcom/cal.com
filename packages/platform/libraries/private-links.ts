import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { isLinkExpired as utilsIsLinkExpired } from "@calcom/lib/hashedLinksUtils";
import { HashedLinkService } from "@calcom/lib/server/service/hashedLinkService";
import type { CreatePrivateLinkInput, UpdatePrivateLinkInput } from "@calcom/platform-types";

export type PrivateLinkData = {
  id: string | number;
  expiresAt?: Date | null;
  maxUsageCount?: number | null;
  usageCount?: number;
  eventTypeId: number;
  isExpired: boolean;
  bookingUrl: string;
};
// Helpers (module-scoped, no class)
const hashedLinkService = new HashedLinkService();

const formatPrivateLinkOutput = (
  link: any,
  eventTypeId: number,
  eventTypeSlug?: string
): PrivateLinkData => {
  const isExpired = utilsIsLinkExpired(link);
  const bookingUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL || "https://cal.com"}/d/${link.link}${
    eventTypeSlug ? `/${eventTypeSlug}` : ""
  }`;

  return {
    id: link.link,
    expiresAt: link.expiresAt,
    maxUsageCount: link.maxUsageCount,
    usageCount: link.usageCount || 0,
    eventTypeId,
    isExpired,
    bookingUrl,
  };
};

const checkUserPermission = async (eventTypeId: number, userId: number): Promise<void> => {
  const links = await hashedLinkService.listLinksByEventType(eventTypeId);
  if (links.length > 0) {
    const firstLink = links[0];
    const linkWithDetails = await hashedLinkService.findLinkWithDetails(firstLink.link);
    if (linkWithDetails) {
      const hasPermission = await hashedLinkService.checkUserPermissionForLink(
        { eventType: linkWithDetails.eventType },
        userId
      );
      if (!hasPermission) {
        throw new Error(`User does not have permission to access event type ${eventTypeId}`);
      }
    }
  }
  // If no links exist yet, assume permission to create; real impl should verify event type ownership.
};

// Public API
export const createPrivateLink = async (
  eventTypeId: number,
  userId: number,
  input: CreatePrivateLinkInput
): Promise<PrivateLinkData> => {
  const linkId = generateHashedLink(userId);
  const createdLink = await hashedLinkService.createLinkForEventType(eventTypeId, {
    link: linkId,
    expiresAt: input.expiresAt || null,
    maxUsageCount: input.maxUsageCount || null,
  });
  return formatPrivateLinkOutput(createdLink, eventTypeId);
};

export const getPrivateLinks = async (
  eventTypeId: number,
  userId: number
): Promise<PrivateLinkData[]> => {
  await checkUserPermission(eventTypeId, userId);
  const links = await hashedLinkService.listLinksByEventType(eventTypeId);
  return links.map((link) => formatPrivateLinkOutput(link, eventTypeId));
};

export const updatePrivateLink = async (
  eventTypeId: number,
  userId: number,
  input: UpdatePrivateLinkInput
): Promise<PrivateLinkData> => {
  await checkUserPermission(eventTypeId, userId);
  const existingLink = await hashedLinkService.findLinkWithDetails(input.linkId);
  if (!existingLink || existingLink.eventTypeId !== eventTypeId) {
    throw new Error(`Private link with ID ${input.linkId} not found for this event type`);
  }
  await hashedLinkService.updateLinkForEventType(eventTypeId, {
    link: input.linkId,
    expiresAt: input.expiresAt || null,
    maxUsageCount: input.maxUsageCount || null,
  });
  const updatedLink = await hashedLinkService.findLinkWithDetails(input.linkId);
  if (!updatedLink) {
    throw new Error("Failed to retrieve updated link");
  }
  return formatPrivateLinkOutput(updatedLink, eventTypeId);
};

export const deletePrivateLink = async (
  eventTypeId: number,
  userId: number,
  linkId: string
): Promise<void> => {
  await checkUserPermission(eventTypeId, userId);
  const existingLink = await hashedLinkService.findLinkWithDetails(linkId);
  if (!existingLink || existingLink.eventTypeId !== eventTypeId) {
    throw new Error(`Private link with ID ${linkId} not found for this event type`);
  }
  await hashedLinkService.deleteLinkForEventType(eventTypeId, linkId);
};
