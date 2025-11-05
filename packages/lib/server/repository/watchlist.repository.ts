import type { PrismaClient } from "@calcom/prisma";
import { WatchlistSource } from "@calcom/prisma/enums";

import type {
  IWatchlistRepository,
  CreateWatchlistInput,
  CheckWatchlistInput,
  WatchlistEntry,
  FindAllEntriesInput,
  WatchlistAuditEntry,
} from "./watchlist.interface";

export class WatchlistRepository implements IWatchlistRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async createEntry(params: CreateWatchlistInput): Promise<WatchlistEntry> {
    const existing = await this.checkExists({
      type: params.type,
      value: params.value,
      organizationId: params.organizationId,
      isGlobal: params.isGlobal,
    });

    if (existing) {
      throw new Error("Watchlist entry already exists for this organization");
    }

    const watchlist = await this.prismaClient.$transaction(async (tx) => {
      const created = await tx.watchlist.create({
        data: {
          type: params.type,
          value: params.value,
          organizationId: params.organizationId,
          action: params.action,
          description: params.description,
          source: WatchlistSource.MANUAL,
          isGlobal: params.isGlobal ?? false,
        },
      });

      await tx.watchlistAudit.create({
        data: {
          watchlistId: created.id,
          type: params.type,
          value: params.value,
          description: params.description,
          action: params.action,
          changedByUserId: params.userId,
        },
      });

      return created;
    });

    return watchlist;
  }

  async checkExists(params: CheckWatchlistInput): Promise<WatchlistEntry | null> {
    if (!params.isGlobal && !params.organizationId) {
      throw new Error("Both isGlobal and organizationId are missing");
    }

    if (params.isGlobal) {
      const entry = await this.prismaClient.watchlist.findFirst({
        where: {
          type: params.type,
          value: params.value,
          isGlobal: true,
          organizationId: null,
        },
      });
      return entry;
    } else if (params.organizationId) {
      const entry = await this.prismaClient.watchlist.findUnique({
        where: {
          type_value_organizationId: {
            type: params.type,
            value: params.value,
            organizationId: params.organizationId,
          },
        },
      });

      return entry;
    }

    return null;
  }

  async findAllEntries(params: FindAllEntriesInput): Promise<{
    rows: (WatchlistEntry & { audits?: { changedByUserId: number | null }[] })[];
    meta: { totalRowCount: number };
  }> {
    const where = {
      organizationId: params.organizationId,
      ...(params.searchTerm && {
        value: {
          contains: params.searchTerm,
          mode: "insensitive" as const,
        },
      }),
      ...(params.filters?.type && {
        type: params.filters.type,
      }),
    };

    const [rows, totalRowCount] = await Promise.all([
      this.prismaClient.watchlist.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: {
          lastUpdatedAt: "desc",
        },
        select: {
          id: true,
          type: true,
          value: true,
          action: true,
          description: true,
          organizationId: true,
          isGlobal: true,
          source: true,
          lastUpdatedAt: true,
          audits: {
            take: 1,
            orderBy: {
              changedAt: "desc",
            },
            select: {
              changedByUserId: true,
            },
          },
        },
      }),
      this.prismaClient.watchlist.count({ where }),
    ]);

    return {
      rows,
      meta: { totalRowCount },
    };
  }

  async findEntryWithAuditAndReports(id: string): Promise<{
    entry:
      | (WatchlistEntry & {
          bookingReports?: Array<{
            booking: {
              uid: string;
              title: string | null;
            };
          }>;
        })
      | null;
    auditHistory: WatchlistAuditEntry[];
  }> {
    const entry = await this.prismaClient.watchlist.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        value: true,
        action: true,
        description: true,
        organizationId: true,
        isGlobal: true,
        source: true,
        lastUpdatedAt: true,
        bookingReports: {
          select: {
            booking: {
              select: {
                uid: true,
                title: true,
              },
            },
          },
        },
        audits: {
          select: {
            id: true,
            watchlistId: true,
            type: true,
            value: true,
            description: true,
            action: true,
            changedByUserId: true,
            changedAt: true,
          },
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

    return {
      entry: entry
        ? {
            id: entry.id,
            type: entry.type,
            value: entry.value,
            action: entry.action,
            description: entry.description ?? null,
            organizationId: entry.organizationId ?? null,
            isGlobal: entry.isGlobal,
            source: entry.source,
            lastUpdatedAt: entry.lastUpdatedAt,
            bookingReports: entry.bookingReports,
          }
        : null,
      auditHistory: entry?.audits || [],
    };
  }

  async deleteEntry(id: string, userId: number): Promise<void> {
    const existing = await this.prismaClient.watchlist.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        value: true,
        description: true,
        action: true,
      },
    });

    if (!existing) {
      throw new Error("Watchlist entry not found");
    }

    await this.prismaClient.$transaction(async (tx) => {
      await tx.watchlistAudit.create({
        data: {
          watchlistId: id,
          type: existing.type,
          value: existing.value,
          description: existing.description,
          action: existing.action,
          changedByUserId: userId,
        },
      });

      await tx.watchlist.delete({
        where: { id },
      });
    });
  }
}
