import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { WatchlistType, WatchlistSeverity } from "@calcom/prisma/enums";

import type { IWatchlistReadRepository } from "../interfaces/IWatchlistRepository";
import type { Watchlist } from "../watchlist.model";

export class PrismaWatchlistReadRepository implements IWatchlistReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBlockedEntry(email: string, organizationId?: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: "BLOCK_BOOKING", // TODO: Use enum when WatchlistAction is added to schema
          organizationId: organizationId ?? null,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findBlockedDomain(domain: string, organizationId?: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: "BLOCK_BOOKING", // TODO: Use enum when WatchlistAction is added to schema
          organizationId: organizationId ?? null,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listByOrganization(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId,
          action: "BLOCK_BOOKING", // TODO: Use enum when WatchlistAction is added to schema
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Legacy methods for backward compatibility
  async getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null> {
    const [, domain] = email.split("@");
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          severity: WatchlistSeverity.CRITICAL,
          OR: [
            { type: WatchlistType.EMAIL, value: email },
            { type: WatchlistType.DOMAIN, value: domain },
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
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async searchForAllBlockedRecords(params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          severity: WatchlistSeverity.CRITICAL,
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
}
