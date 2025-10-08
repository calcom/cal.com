import { captureException } from "@sentry/nextjs";

import { prisma as defaultPrisma } from "@calcom/prisma";
import type { PrismaClient, Watchlist } from "@calcom/prisma/client";
import { WatchlistAction, WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { normalizeEmail, normalizeDomain } from "../utils/normalization";

/**
 * Repository for global watchlist operations (organizationId = null)
 * Handles system-wide blocking rules that apply to all organizations
 */
export class GlobalWatchlistRepository implements IGlobalWatchlistRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findBlockedEmail(email: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findFirst({
        where: {
          type: WatchlistType.EMAIL,
          value: normalizeEmail(email),
          action: WatchlistAction.BLOCK,
          organizationId: null,
          isGlobal: true,
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
          value: normalizeDomain(domain),
          action: WatchlistAction.BLOCK,
          organizationId: null,
          isGlobal: true,
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
          value: normalizeDomain(domain),
          source: WatchlistSource.FREE_DOMAIN_POLICY,
          organizationId: null,
          isGlobal: true,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findById(id: string): Promise<Watchlist | null> {
    try {
      return await this.prisma.watchlist.findUnique({
        where: {
          id,
          organizationId: null,
          isGlobal: true,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async listBlockedEntries(): Promise<Watchlist[]> {
    try {
      return await this.prisma.watchlist.findMany({
        where: {
          organizationId: null,
          isGlobal: true,
          action: WatchlistAction.BLOCK,
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
          value: data.type === WatchlistType.EMAIL ? normalizeEmail(data.value) : normalizeDomain(data.value),
          description: data.description,
          isGlobal: true,
          organizationId: null,
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
          organizationId: null,
        },
        data: {
          ...(data.value && {
            value:
              data.value.includes("@") && !data.value.startsWith("@")
                ? normalizeEmail(data.value)
                : normalizeDomain(data.value),
          }),
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
          organizationId: null,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
