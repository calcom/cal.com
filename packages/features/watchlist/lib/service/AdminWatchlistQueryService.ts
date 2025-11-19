import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import type { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import type { PrismaClient } from "@calcom/prisma";
import type { WatchlistType, WatchlistSource } from "@calcom/prisma/enums";

export interface ListWatchlistEntriesInput {
  limit: number;
  offset: number;
  searchTerm?: string;
  filters?: {
    type?: WatchlistType;
    source?: WatchlistSource;
  };
}

export interface GetWatchlistEntryDetailsInput {
  entryId: string;
}

export interface ListBookingReportsInput {
  limit: number;
  offset: number;
  searchTerm?: string;
  filters?: {
    status?: string;
  };
}

type Deps = {
  watchlistRepo: WatchlistRepository;
  bookingReportRepo: PrismaBookingReportRepository;
  userRepo: UserRepository;
  prisma: PrismaClient;
};

export class AdminWatchlistQueryService {
  constructor(private readonly deps: Deps) {}

  async listWatchlistEntries(input: ListWatchlistEntriesInput) {
    const { rows, meta } = await this.deps.watchlistRepo.findAllEntries({
      organizationId: null,
      isGlobal: true,
      limit: input.limit,
      offset: input.offset,
      searchTerm: input.searchTerm,
      filters: input.filters,
    });

    const userIds = rows
      .map((entry) => entry.audits?.[0]?.changedByUserId)
      .filter((id): id is number => id !== null && id !== undefined);

    const uniqueUserIds = Array.from(new Set(userIds));

    const users = uniqueUserIds.length > 0 ? await this.deps.userRepo.findUsersByIds(uniqueUserIds) : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const rowsWithCreators = rows.map((entry) => {
      const audit = entry.audits?.[0];
      if (audit?.changedByUserId) {
        const changedByUser = userMap.get(audit.changedByUserId);
        return {
          ...entry,
          audits: [
            {
              ...audit,
              changedByUser,
            },
          ],
        };
      }
      return entry;
    });

    return {
      rows: rowsWithCreators,
      meta,
    };
  }

  async getWatchlistEntryDetails(input: GetWatchlistEntryDetailsInput) {
    const result = await this.deps.watchlistRepo.findEntryWithAuditAndReports(input.entryId);

    if (!result.entry) {
      throw new Error("Blocklist entry not found");
    }

    if (!result.entry.isGlobal || result.entry.organizationId !== null) {
      throw new Error("You can only view system blocklist entries");
    }

    const userIds = result.auditHistory
      .map((audit) => audit.changedByUserId)
      .filter((id): id is number => id !== null && id !== undefined);

    const uniqueUserIds = Array.from(new Set(userIds));

    const users = uniqueUserIds.length > 0 ? await this.deps.userRepo.findUsersByIds(uniqueUserIds) : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const auditHistoryWithUsers = result.auditHistory.map((audit) => ({
      ...audit,
      changedByUser: audit.changedByUserId ? userMap.get(audit.changedByUserId) : undefined,
    }));

    return {
      entry: result.entry,
      auditHistory: auditHistoryWithUsers,
    };
  }

  async listBookingReports(input: ListBookingReportsInput) {
    const result = await this.deps.bookingReportRepo.findAllReportedBookings({
      skip: input.offset,
      take: input.limit,
      searchTerm: input.searchTerm,
      filters: input.filters,
    });

    return result;
  }

  async getPendingReportsCount(): Promise<number> {
    return this.deps.prisma.bookingReport.count({
      where: {
        status: "PENDING",
        watchlistId: null,
      },
    });
  }
}
