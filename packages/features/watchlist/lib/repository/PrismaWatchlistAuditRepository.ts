import type { PrismaClient } from "@calcom/prisma/client";
import type { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";
import type {
  CreateWatchlistAuditInput,
  IAuditRepository,
  UpdateWatchlistAuditInput,
} from "../interface/IAuditRepository";
import type { WatchlistAudit } from "../types";

export class PrismaWatchlistAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private readonly selectFields = {
    id: true,
    type: true,
    value: true,
    description: true,
    action: true,
    changedAt: true,
    changedByUserId: true,
    watchlistId: true,
  } as const;

  async create(data: CreateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.prisma.watchlistAudit.create({
      select: this.selectFields,
      data: {
        type: data.type as WatchlistType,
        value: data.value,
        description: data.description,
        action: data.action as WatchlistAction,
        changedByUserId: data.changedByUserId,
        watchlistId: data.watchlistId,
      },
    });
  }

  async findById(id: string): Promise<WatchlistAudit | null> {
    return this.prisma.watchlistAudit.findUnique({
      select: this.selectFields,
      where: { id },
    });
  }

  async findByWatchlistId(watchlistId: string): Promise<WatchlistAudit[]> {
    return this.prisma.watchlistAudit.findMany({
      select: this.selectFields,
      where: { watchlistId },
      orderBy: { changedAt: "desc" },
    });
  }

  async update(id: string, data: UpdateWatchlistAuditInput): Promise<WatchlistAudit> {
    return this.prisma.watchlistAudit.update({
      select: this.selectFields,
      where: { id },
      data: {
        ...(data.type && { type: data.type as WatchlistType }),
        ...(data.value && { value: data.value }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.action && { action: data.action as WatchlistAction }),
        ...(data.changedByUserId !== undefined && { changedByUserId: data.changedByUserId }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    return this.prisma.watchlistAudit
      .delete({
        where: { id },
      })
      .then(() => {});
  }

  async findMany(filters?: {
    watchlistId?: string;
    changedByUserId?: number;
    limit?: number;
    offset?: number;
  }): Promise<WatchlistAudit[]> {
    return this.prisma.watchlistAudit.findMany({
      select: this.selectFields,
      where: {
        ...(filters?.watchlistId && { watchlistId: filters.watchlistId }),
        ...(filters?.changedByUserId && { changedByUserId: filters.changedByUserId }),
      },
      orderBy: { changedAt: "desc" },
      ...(filters?.limit && { take: filters.limit }),
      ...(filters?.offset && { skip: filters.offset }),
    });
  }
}
