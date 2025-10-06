import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type { Watchlist } from "../types";

/**
 * Repository for organization-specific watchlist operations
 * Handles blocking rules that apply only to a specific organization
 */
export class OrganizationWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBlockedEmail(email: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId, // Organization-specific only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findBlockedDomain(domain: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: WatchlistAction.BLOCK,
          organizationId, // Organization-specific only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findReportedEmail(email: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.REPORT,
          organizationId, // Organization-specific only
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findReportedDomain(domain: string, organizationId: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.DOMAIN,
          value: domain.toLowerCase(),
          action: WatchlistAction.REPORT,
          organizationId, // Organization-specific only
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
          organizationId, // Organization-specific only
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listBlockedByOrganization(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId, // Organization-specific only
          action: WatchlistAction.BLOCK,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listReportedByOrganization(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId, // Organization-specific only
          action: WatchlistAction.REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async searchOrganizationBlockedRecords(
    organizationId: number,
    params: {
      usernames: string[];
      emails: string[];
      domains: string[];
    }
  ): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId, // Organization-specific only
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

  async countEntriesByOrganization(organizationId: number): Promise<{
    total: number;
    blocked: number;
    reported: number;
  }> {
    try {
      const [total, blocked, reported] = await Promise.all([
        this.prisma.watchlist.count({
          where: { organizationId },
        }),
        this.prisma.watchlist.count({
          where: { organizationId, action: WatchlistAction.BLOCK },
        }),
        this.prisma.watchlist.count({
          where: { organizationId, action: WatchlistAction.REPORT },
        }),
      ]);

      return { total, blocked, reported };
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
