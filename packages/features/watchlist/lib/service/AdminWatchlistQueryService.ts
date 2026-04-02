import type {
  ListBookingReportsFilters,
  SystemBookingReportsFilters,
} from "@calcom/features/bookingReport/repositories/IBookingReportRepository";
import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { WatchlistErrors } from "../errors/WatchlistErrors";

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
  filters?: ListBookingReportsFilters;
  systemFilters?: SystemBookingReportsFilters;
  sortBy?: "createdAt" | "reportCount";
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
    const { rows, meta } = await this.deps.watchlistRepo.findAllEntriesWithLatestAudit({
      organizationId: null,
      isGlobal: true,
      limit: input.limit,
      offset: input.offset,
      searchTerm: input.searchTerm,
      filters: input.filters,
    });

    const userIds = rows
      .map((entry) => entry.latestAudit?.changedByUserId)
      .filter((id): id is number => id !== null && id !== undefined);

    const uniqueUserIds = Array.from(new Set(userIds));

    const users = uniqueUserIds.length > 0 ? await this.deps.userRepo.findUsersByIds(uniqueUserIds) : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const rowsWithCreators = rows.map((entry) => {
      if (entry.latestAudit?.changedByUserId) {
        const changedByUser = userMap.get(entry.latestAudit.changedByUserId);
        return {
          ...entry,
          latestAudit: {
            ...entry.latestAudit,
            changedByUser,
          },
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
      throw WatchlistErrors.notFound("Blocklist entry not found");
    }

    if (!result.entry.isGlobal || result.entry.organizationId !== null) {
      throw WatchlistErrors.permissionDenied("You can only view system blocklist entries");
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
    const result = await this.deps.bookingReportRepo.findGroupedReportedBookings({
      skip: input.offset,
      take: input.limit,
      searchTerm: input.searchTerm,
      filters: input.filters,
      systemFilters: input.systemFilters,
      sortBy: input.sortBy,
    });

    return result;
  }

  async getPendingReportsCount(): Promise<number> {
    return this.deps.bookingReportRepo.countSystemPendingReports();
  }
}
