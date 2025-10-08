import { captureException } from "@sentry/nextjs";

import { prisma as defaultPrisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import type {
  IAuditRepository,
  CreateWatchlistAuditInput,
  UpdateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { WatchlistAudit } from "../types";

export class AuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async create(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
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

  async findById(id: string): Promise<WatchlistAudit | null> {
    try {
      return await this.prisma.watchlistAudit.findUnique({
        where: { id },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findByWatchlistId(watchlistId: string): Promise<WatchlistAudit[]> {
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

  async update(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    try {
      return await this.prisma.watchlistAudit.update({
        where: { id },
        data: {
          ...(data.type && { type: data.type as WatchlistType }),
          ...(data.value && { value: data.value }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.action && { action: data.action as WatchlistAction }),
          ...(data.changedByUserId !== undefined && { changedByUserId: data.changedByUserId }),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.watchlistAudit.delete({
        where: { id },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findMany(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    try {
      return await this.prisma.watchlistAudit.findMany({
        where: {
          ...(filters?.watchlistId && { watchlistId: filters.watchlistId }),
          ...(filters?.changedByUserId && { changedByUserId: filters.changedByUserId }),
        },
        orderBy: { changedAt: "desc" },
        ...(filters?.limit && { take: filters.limit }),
        ...(filters?.offset && { skip: filters.offset }),
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
