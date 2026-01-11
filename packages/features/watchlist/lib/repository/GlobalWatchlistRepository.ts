import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";

/**
 * Repository for global watchlist operations (organizationId = null)
 * Handles system-wide blocking rules that apply to all organizations
 *
 * Note: Expects normalized values from the service layer
 */
export class GlobalWatchlistRepository implements IGlobalWatchlistRepository {
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

  async findBlockedEmail(email: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.EMAIL,
        value: email,
        action: WatchlistAction.BLOCK,
        organizationId: null,
        isGlobal: true,
      },
    });
  }

  async findBlockedDomain(domain: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.DOMAIN,
        value: domain,
        action: WatchlistAction.BLOCK,
        organizationId: null,
        isGlobal: true,
      },
    });
  }

  async findFreeEmailDomain(domain: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        type: WatchlistType.DOMAIN,
        value: domain,
        source: WatchlistSource.FREE_DOMAIN_POLICY,
        organizationId: null,
        isGlobal: true,
      },
    });
  }

  async findById(id: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({
      select: this.selectFields,
      where: {
        id,
        organizationId: null,
        isGlobal: true,
      },
    });
  }

  async listBlockedEntries(): Promise<Watchlist[]> {
    return this.prisma.watchlist.findMany({
      select: this.selectFields,
      where: {
        organizationId: null,
        isGlobal: true,
        action: WatchlistAction.BLOCK,
      },
    });
  }

  /**
   * Bulk find blocking entries for multiple emails and domains.
   * Single query for N emails and domains - eliminates N+1.
   */
  async findBlockingEntriesForEmailsAndDomains(params: {
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    const { emails, domains } = params;

    if (emails.length === 0 && domains.length === 0) {
      return [];
    }

    const conditions: Array<{ type: WatchlistType; value: { in: string[] } }> = [];

    if (emails.length > 0) {
      conditions.push({ type: WatchlistType.EMAIL, value: { in: emails } });
    }

    if (domains.length > 0) {
      conditions.push({ type: WatchlistType.DOMAIN, value: { in: domains } });
    }

    return this.prisma.watchlist.findMany({
      select: this.selectFields,
      where: {
        organizationId: null,
        isGlobal: true,
        action: WatchlistAction.BLOCK,
        OR: conditions,
      },
    });
  }

  // Write operations for global entries
  async createEntry(data: {
    type: WatchlistType;
    value: string;
    description?: string | null;
    action: WatchlistAction;
    source?: WatchlistSource;
  }): Promise<Watchlist> {
    return this.prisma.watchlist.create({
      select: this.selectFields,
      data: {
        type: data.type,
        value: data.value,
        description: data.description,
        isGlobal: true,
        organizationId: null,
        action: data.action,
        source: data.source || WatchlistSource.MANUAL,
      },
    });
  }

  async updateEntry(
    id: string,
    data: {
      value?: string;
      description?: string | null;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    return this.prisma.watchlist.update({
      select: this.selectFields,
      where: { id },
      data: {
        ...(data.value !== undefined && { value: data.value }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.action && { action: data.action }),
        ...(data.source && { source: data.source }),
      },
    });
  }

  async deleteEntry(id: string): Promise<void> {
    this.prisma.watchlist.delete({
      where: { id },
    });
  }
}
