/**
 * ORM-agnostic interface for HashedLinkRepository
 * This interface defines the contract for hashed link data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface HashedLinkDto {
  id: number;
  link: string;
  eventTypeId: number;
  expiresAt: Date | null;
  maxUsageCount: number | null;
  usageCount: number;
}

export interface HashedLinkBasicDto {
  link: string;
  expiresAt: Date | null;
  maxUsageCount: number | null;
  usageCount: number;
}

export interface HashedLinkWithEventTypeDto {
  id: number;
  link: string;
  expiresAt: Date | null;
  maxUsageCount: number | null;
  usageCount: number;
  eventTypeId: number;
  eventType: {
    teamId: number | null;
    userId: number | null;
  } | null;
}

export interface HashedLinkCreateInput {
  link: string;
  expiresAt: Date | null;
  maxUsageCount?: number | null;
}

export interface IHashedLinkRepository {
  deleteLinks(eventTypeId: number, linksToDelete: string[]): Promise<void>;

  createLink(eventTypeId: number, linkData: HashedLinkCreateInput): Promise<HashedLinkDto>;

  updateLink(eventTypeId: number, linkData: HashedLinkCreateInput): Promise<number>;

  findLinksByEventTypeId(eventTypeId: number): Promise<HashedLinkBasicDto[]>;

  findLinkWithEventTypeDetails(linkId: string): Promise<HashedLinkWithEventTypeDto | null>;

  findLinksWithEventTypeDetails(linkIds: string[]): Promise<HashedLinkWithEventTypeDto[]>;

  incrementUsage(linkId: number, maxUsageCount: number): Promise<HashedLinkDto>;
}
