import { WatchlistErrors } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";
import type { PrismaClient } from "@calcom/prisma";
import { WatchlistAction, WatchlistSource } from "@calcom/prisma/enums";

import type { IBookingReportRepository } from "./bookingReport.interface";
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

  async createEntry(params: CreateWatchlistInput & { skipExistenceCheck?: boolean }): Promise<WatchlistEntry> {
    if (!params.skipExistenceCheck) {
      const existing = await this.checkExists({
        type: params.type,
        value: params.value,
        organizationId: params.organizationId,
        isGlobal: params.isGlobal,
      });

      if (existing) {
        throw WatchlistErrors.duplicateEntry("Watchlist entry already exists for this organization");
      }
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
      isGlobal: params.isGlobal,
      ...(params.searchTerm && {
        value: {
          contains: params.searchTerm,
          mode: "insensitive" as const,
        },
      }),
      ...(params.filters?.type && {
        type: params.filters.type,
      }),
      ...(params.filters?.source && {
        source: params.filters.source,
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

  async findEntriesByIds(ids: string[]): Promise<
    Array<{
      id: string;
      isGlobal: boolean;
      organizationId: number | null;
    }>
  > {
    return this.prismaClient.watchlist.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        isGlobal: true,
        organizationId: true,
      },
    });
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
      throw WatchlistErrors.notFound("Watchlist entry not found");
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

  async bulkDeleteEntries(params: { ids: string[]; userId: number }): Promise<{ deleted: number }> {
    const entries = await this.prismaClient.watchlist.findMany({
      where: { id: { in: params.ids } },
      select: {
        id: true,
        type: true,
        value: true,
        description: true,
        action: true,
      },
    });

    if (entries.length === 0) {
      return { deleted: 0 };
    }

    await this.prismaClient.$transaction(async (tx) => {
      await tx.watchlistAudit.createMany({
        data: entries.map((entry) => ({
          watchlistId: entry.id,
          type: entry.type,
          value: entry.value,
          description: entry.description,
          action: entry.action,
          changedByUserId: params.userId,
        })),
      });

      await tx.watchlist.deleteMany({
        where: { id: { in: entries.map((e) => e.id) } },
      });
    });

    return { deleted: entries.length };
  }

  async createEntryFromReport(params: {
    type: CreateWatchlistInput["type"];
    value: string;
    organizationId: number | null;
    isGlobal: boolean;
    userId: number;
    description?: string;
  }): Promise<{ watchlistEntry: WatchlistEntry; value: string }> {
    const existing = await this.checkExists({
      type: params.type,
      value: params.value,
      organizationId: params.organizationId,
      isGlobal: params.isGlobal,
    });

    const watchlistEntry =
      existing ??
      (await this.createEntry({
        type: params.type,
        value: params.value,
        organizationId: params.organizationId,
        isGlobal: params.isGlobal,
        action: WatchlistAction.BLOCK,
        description: params.description,
        userId: params.userId,
        skipExistenceCheck: true,
      }));

    return { watchlistEntry, value: params.value };
  }

  async addReportsToWatchlist(params: {
    reportIds: string[];
    type: CreateWatchlistInput["type"];
    normalizedValues: Map<string, string>;
    organizationId: number | null;
    isGlobal: boolean;
    userId: number;
    description?: string;
    bookingReportRepo: IBookingReportRepository;
  }): Promise<{
    success: number;
    skipped: number;
    results: Array<{ reportId: string; watchlistId: string; value: string }>;
  }> {
    const reports = await params.bookingReportRepo.findReportsByIds({
      reportIds: params.reportIds,
      organizationId: params.isGlobal ? undefined : params.organizationId ?? undefined,
    });

    const reportsToAdd = reports.filter((r) => !r.watchlistId);

    if (reportsToAdd.length === 0) {
      return { success: 0, skipped: reports.length, results: [] };
    }

    const results = await Promise.all(
      reportsToAdd.map(async (report) => {
        const normalizedValue = params.normalizedValues.get(report.id);
        if (!normalizedValue) {
          throw new Error(`Normalized value not found for report ${report.id}`);
        }

        const { watchlistEntry, value } = await this.createEntryFromReport({
          type: params.type,
          value: normalizedValue,
          organizationId: params.organizationId,
          isGlobal: params.isGlobal,
          userId: params.userId,
          description: params.description,
        });

        return {
          reportId: report.id,
          watchlistId: watchlistEntry.id,
          value,
        };
      })
    );

    await params.bookingReportRepo.bulkLinkWatchlistWithStatus({
      links: results.map((r) => ({ reportId: r.reportId, watchlistId: r.watchlistId })),
      status: "BLOCKED",
    });

    return {
      success: reportsToAdd.length,
      skipped: reports.length - reportsToAdd.length,
      results,
    };
  }
}
