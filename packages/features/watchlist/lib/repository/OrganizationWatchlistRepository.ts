import { captureException } from "@sentry/nextjs";

import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";

/**
 * Repository for organization-specific watchlist operations
 * Handles blocking rules that apply only to a specific organization
 */
export class OrganizationWatchlistRepository implements IOrganizationWatchlistRepository {
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
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          isGlobal: false, // Always organization-specific
          organizationId, // Set to specific organization
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
    organizationId: number,
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
          organizationId, // Ensure we only update entries for this org
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

  async deleteEntry(id: string, organizationId: number): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: {
          id,
          organizationId, // Ensure we only delete entries for this org
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listOrganizationEntries(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId,
        },
        orderBy: { lastUpdatedAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listOrganizationBlockedEntries(organizationId: number): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId,
          action: WatchlistAction.BLOCK,
        },
        orderBy: { lastUpdatedAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
