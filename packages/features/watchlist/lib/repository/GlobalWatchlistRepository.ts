import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type { Watchlist } from "../types";

/**
 * Repository for global watchlist operations (organizationId = null)
 * Handles system-wide blocking rules that apply to all organizations
 */
export class GlobalWatchlistRepository {
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
}
