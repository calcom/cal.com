import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type {
  IWatchlistRepository,
  CreateWatchlistInput,
  UpdateWatchlistInput,
} from "../interface/IWatchlistRepositories";
import type { Watchlist } from "../types";

/**
 * Unified Watchlist Repository that handles both read and write operations
 * Following the same pattern as WebhookRepository in the webhooks feature
 */
export class WatchlistRepository implements IWatchlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Read operations
  async findBlockedEntry(email: string, organizationId?: number): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: email.toLowerCase(),
          action: WatchlistAction.BLOCK,
          OR: [{ isGlobal: true }, { organizationId: organizationId }],
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
          action: WatchlistAction.BLOCK,
          OR: [{ isGlobal: true }, { organizationId: organizationId }],
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
          OR: [{ organizationId: organizationId }, { isGlobal: true }],
        },
        orderBy: { lastUpdatedAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findById(id: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findUnique({
        where: { id },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findMany(params: { organizationId?: number; isGlobal?: boolean }): Promise<Watchlist[]> {
    try {
      const where: { organizationId?: number; isGlobal?: boolean } = {};

      if (params.isGlobal !== undefined) {
        where.isGlobal = params.isGlobal;
      }

      if (params.organizationId !== undefined) {
        where.organizationId = params.organizationId;
      }

      return await this.prisma.watchlist.findMany({
        where,
        orderBy: { lastUpdatedAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Legacy methods for backward compatibility
  async getBlockedEmailInWatchlist(email: string): Promise<Watchlist | null> {
    return this.findBlockedEntry(email);
  }

  async getFreeEmailDomainInWatchlist(emailDomain: string): Promise<Watchlist | null> {
    return this.findBlockedDomain(emailDomain);
  }

  async searchForAllBlockedRecords(params: {
    usernames: string[];
    emails: string[];
    domains: string[];
  }): Promise<Watchlist[]> {
    try {
      const conditions = [];

      if (params.emails.length > 0) {
        conditions.push({
          type: WatchlistType.EMAIL,
          value: { in: params.emails.map((email) => email.toLowerCase()) },
          action: WatchlistAction.BLOCK,
        });
      }

      if (params.domains.length > 0) {
        conditions.push({
          type: WatchlistType.DOMAIN,
          value: { in: params.domains.map((domain) => domain.toLowerCase()) },
          action: WatchlistAction.BLOCK,
        });
      }

      if (conditions.length === 0) {
        return [];
      }

      return await this.prisma.watchlist.findMany({
        where: {
          OR: conditions,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Write operations
  async create(data: CreateWatchlistInput): Promise<Watchlist> {
    return this.createEntry(data);
  }

  async createEntry(data: CreateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.create({
        data: {
          type: data.type,
          value: data.value.toLowerCase(),
          description: data.description,
          isGlobal: data.isGlobal ?? false,
          organizationId: data.organizationId ?? null,
          action: data.action || WatchlistAction.REPORT,
          source: data.source || WatchlistSource.MANUAL,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async update(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    return this.updateEntry(id, data);
  }

  async updateEntry(id: string, data: UpdateWatchlistInput): Promise<Watchlist> {
    try {
      return await this.prisma.watchlist.update({
        where: { id },
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

  async delete(id: string): Promise<void> {
    return this.deleteEntry(id);
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.prisma.watchlist.delete({
        where: { id },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
