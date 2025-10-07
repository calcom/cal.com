import { captureException } from "@sentry/nextjs";

import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";

/**
 * Repository for global watchlist operations (organizationId = null)
 * Handles system-wide blocking rules that apply to all organizations
 */
export class GlobalWatchlistRepository implements IGlobalWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBlockedEmail(email: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findBlockedDomain(domain: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findFreeEmailDomain(domain: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          source: WatchlistSource.FREE_DOMAIN_POLICY,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findReportedEmail(email: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.REPORT,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findReportedDomain(domain: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: WatchlistAction.REPORT,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listAllGlobalEntries(): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId: null, // Global entries only
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listGlobalBlockedEntries(): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId: null, // Global entries only
          action: WatchlistAction.BLOCK,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listGlobalReportedEntries(): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId: null, // Global entries only
          action: WatchlistAction.REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async searchGlobalBlockedRecords(params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId: null, // Global entries only
          action: WatchlistAction.BLOCK,
          OR: [
            ...(params.usernames.length > 0
              ? [
                  {
                    type: WatchlistType.USERNAME,
                    value: {
                      in: params.usernames,
                    },
                  },
                ]
              : []),
            ...(params.emails.length > 0
              ? [
                  {
                    type: WatchlistType.EMAIL,
                    value: {
                      in: params.emails,
                    },
                  },
                ]
              : []),
            ...(params.domains.length > 0
              ? [
                  {
                    type: WatchlistType.DOMAIN,
                    value: {
                      in: params.domains,
                    },
                  },
                ]
              : []),
          ],
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getFreeEmailDomainInWatchlist(emailDomain: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: emailDomain,
          organizationId: null, // Global entries only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Write operations for global entries
  async createEntry(data: {
    type: WatchlistType;
    value: string;
    description?: string;
    action: WatchlistAction;
    source?: WatchlistSource;
  }): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          isGlobal: true, // Always global
          organizationId: null, // Always null for global
          action: data.action,
          source: data.source || WatchlistSource.MANUAL,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateEntry(
    id: string,
    data: {
      value?: string;
      description?: string;
      action?: WatchlistAction;
      source?: WatchlistSource;
    }
  ): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: {
          id,
          organizationId: null, // Ensure we only update global entries
        },
        data: {
          ...(data.value && { value: data.value.toLowerCase() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.action && { action: data.action }),
          ...(data.source && { source: data.source }),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: {
          id,
          organizationId: null, // Ensure we only delete global entries
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
