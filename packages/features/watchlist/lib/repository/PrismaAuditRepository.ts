import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type {
  IAuditRepository,
  CreateWatchlistEventAuditInput,
  CreateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { WatchlistEventAudit, WatchlistAudit } from "../types";

export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEventAudit(data: CreateWatchlistEventAuditInput): Promise<WatchlistEventAudit> {
    try {
      return await this.prisma.watchlistEventAudit.create({
        data: {
          watchlistId: data.watchlistId,
          eventTypeId: data.eventTypeId,
          actionTaken: data.actionTaken as WatchlistAction,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getEventAuditsByOrganization(organizationId: number): Promise<WatchlistEventAudit[]> {
    try {
      // Join with Watchlist to filter by organization
      return (await this.prisma.watchlistEventAudit.findMany({
        where: {
          watchlist: {
            OR: [{ organizationId: organizationId }, { isGlobal: true }],
          },
        },
        select: {
          id: true,
          watchlistId: true,
          eventTypeId: true,
          actionTaken: true,
          timestamp: true,
          watchlist: {
            select: {
              id: true,
              type: true,
              value: true,
              organizationId: true,
              isGlobal: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take: 100, // Limit to recent 100 entries
      })) as WatchlistEventAudit[];
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getBlockingStats(organizationId: number): Promise<{
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  }> {
    try {
      // Get total count of blocked events for this organization
      const total = await this.prisma.watchlistEventAudit.count({
        where: {
          actionTaken: WatchlistAction.BLOCK,
          watchlist: {
            OR: [{ organizationId: organizationId }, { isGlobal: true }],
          },
        },
      });

      // Get counts by type
      const emailBlocked = await this.prisma.watchlistEventAudit.count({
        where: {
          actionTaken: WatchlistAction.BLOCK,
          watchlist: {
            type: WatchlistType.EMAIL,
            OR: [{ organizationId: organizationId }, { isGlobal: true }],
          },
        },
      });

      const domainBlocked = await this.prisma.watchlistEventAudit.count({
        where: {
          actionTaken: WatchlistAction.BLOCK,
          watchlist: {
            type: WatchlistType.DOMAIN,
            OR: [{ organizationId: organizationId }, { isGlobal: true }],
          },
        },
      });

      return {
        totalBlocked: total,
        blockedByEmail: emailBlocked,
        blockedByDomain: domainBlocked,
      };
    } catch (err) {
      captureException(err);
      throw new Error(`Failed to get blocking stats: ${err}`);
    }
  }

  async createChangeAudit(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
    try {
      return await this.prisma.watchlistAudit.create({
        data: {
          type: data.type as WatchlistType,
          value: data.value,
          description: data.description,
          action: data.action as WatchlistAction,
          changedByUserId: data.changedByUserId,
          watchlistId: data.watchlistId,
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getChangeHistory(watchlistId: string): Promise<WatchlistAudit[]> {
    try {
      return await this.prisma.watchlistAudit.findMany({
        where: { watchlistId },
        orderBy: { changedAt: "desc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  // Legacy method names for backward compatibility
  async createBlockedBookingEntry(data: CreateWatchlistEventAuditInput): Promise<WatchlistEventAudit> {
    return this.createEventAudit(data);
  }

  async getBlockedBookingsByOrganization(organizationId: number): Promise<WatchlistEventAudit[]> {
    return this.getEventAuditsByOrganization(organizationId);
  }
}
