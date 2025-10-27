import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";

/**
 * Repository for organization-specific watchlist operations
 * Handles blocking rules that apply only to a specific organization,
 * or to all organizations
 *
 * Note: Expects normalized values from the service layer
 */
export class OrganizationWatchlistRepository implements IOrganizationWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly selectFields = {
    id: true,
    type: true,
    value: true,
    description: true,
    isGlobal: true,
    organizationId: true,
    action: true,
    source: true,
    lastUpdatedAt: true,
  } as const;

  async findBlockedEmail({
    email,
    organizationId,
  }: {
    email: string;
    organizationId: number;
  }): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.EMAIL,
        value: email,
        action: WatchlistAction.BLOCK,
        organizationId,
      },
    });
  }

  async findBlockedDomain(domain: string, organizationId: number): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.DOMAIN,
        value: domain,
        action: WatchlistAction.BLOCK,
        organizationId,
      },
    });
  }

  async listBlockedEntries(organizationId: number): Promise<Watchlist[]> {
    return this.prisma.watchlist.findMany({
      select: this.selectFields,
      where: {
        organizationId,
        action: WatchlistAction.BLOCK,
      },
    });
  }

  async listAllOrganizationEntries(): Promise<Watchlist[]> {
    return this.prisma.watchlist.findMany({
      select: this.selectFields,
      where: {
        organizationId: { not: null },
        isGlobal: false,
        action: WatchlistAction.BLOCK,
      },
    });
  }

  async findById(id: string, organizationId: number): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        id,
        organizationId,
      },
    });
  }

  // Write operations for organization-specific entries
  async createEntry(
    organizationId: number,
    data: {
      type: WatchlistType;
      value: string;
      description?: string;
      action: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    return this.prisma.watchlist.create({
      select: this.selectFields,
      data: {
        type: data.type,
        value: data.value,
        description: data.description,
        isGlobal: false,
        organizationId,
        action: data.action,
        source: data.source || WatchlistSource.MANUAL,
      },
    });
  }

  async updateEntry(
    id: string,
    organizationId: number,
    data: {
      value?: string;
      description?: string | null;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    return this.prisma.watchlist.update({
      select: this.selectFields,
      where: { id, organizationId },
      data: {
        ...(data.value !== undefined && { value: data.value }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.action !== undefined && { action: data.action }),
        ...(data.source !== undefined && { source: data.source }),
      },
    });
  }

  async deleteEntry(id: string, organizationId: number): Promise<void> {
    return this.prisma.watchlist
      .delete({
        where: { id, organizationId },
      })
      .then(() => {});
  }
}
