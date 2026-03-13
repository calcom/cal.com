import type {
  ListBookingReportsFilters,
  SystemBookingReportsFilters,
} from "@calcom/features/bookingReport/repositories/IBookingReportRepository";
import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import type { WatchlistSource, WatchlistType } from "@calcom/prisma/enums";
import { BookingReportReason } from "@calcom/prisma/enums";
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
  bookingRepo: BookingRepository;
  userRepo: UserRepository;
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

  async getEntryImpact({ type, value }: { type: WatchlistType; value: string }) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const isEmail = type === "EMAIL";
    const attendeeWhere = isEmail ? { email: value } : { email: { endsWith: `@${value}` } };
    const bookerEmail = isEmail ? value : `@${value}`;

    const [bookingStats, recentBookingCount, distinctHostCount, reportData, existingOrgBlockCount, orgResult] =
      await this.fetchImpactData({
        type,
        value,
        attendeeWhere,
        bookerEmail,
        isExactEmail: isEmail,
        thirtyDaysAgo,
        sevenDaysAgo,
      });

    const { totalBookings, statusBreakdown } = this.aggregateBookingStats(bookingStats);
    const { reportCount, reportsByReason } = this.aggregateReportData(reportData);
    const { topAffectedOrgs, affectedOrgCount } = await this.resolveAffectedOrgs({
      orgResult,
      bookerEmail,
      isExactEmail: isEmail,
      thirtyDaysAgo,
    });

    return {
      totalBookings,
      recentBookings: recentBookingCount,
      distinctHostCount,
      affectedOrgCount,
      reportCount,
      reportsByReason,
      existingOrgBlockCount,
      statusBreakdown,
      topAffectedOrgs,
    };
  }

  private async fetchImpactData({
    type,
    value,
    attendeeWhere,
    bookerEmail,
    isExactEmail,
    thirtyDaysAgo,
    sevenDaysAgo,
  }: {
    type: WatchlistType;
    value: string;
    attendeeWhere: { email: string } | { email: { endsWith: string } };
    bookerEmail: string;
    isExactEmail: boolean;
    thirtyDaysAgo: Date;
    sevenDaysAgo: Date;
  }) {
    return Promise.all([
      this.deps.bookingRepo.getBookingStatsByAttendee({ attendeeWhere, since: thirtyDaysAgo }),
      this.deps.bookingRepo.countBookingsByAttendee({ attendeeWhere, since: sevenDaysAgo }),
      this.deps.bookingRepo.countDistinctHostsByAttendee({ attendeeWhere, since: thirtyDaysAgo }),
      this.deps.bookingReportRepo.getReportReasonCounts({ email: bookerEmail, isExactEmail, since: thirtyDaysAgo }),
      this.deps.watchlistRepo.countOrgEntriesForValue({ type, value }),
      this.deps.bookingRepo.getTopOrgsByAttendeeBookings({ attendeeWhere, since: thirtyDaysAgo, limit: 3 }),
    ]);
  }

  private aggregateBookingStats(bookingStats: Array<{ status: string; _count: { id: number } }>) {
    const STATUS_MAP: Record<string, keyof typeof statusBreakdown> = {
      ACCEPTED: "accepted",
      CANCELLED: "cancelled",
      REJECTED: "rejected",
      PENDING: "pending",
      AWAITING_HOST: "awaitingHost",
    };
    const statusBreakdown = { accepted: 0, cancelled: 0, rejected: 0, pending: 0, awaitingHost: 0 };
    let totalBookings = 0;

    for (const row of bookingStats) {
      const count = row._count.id;
      totalBookings += count;
      const key = STATUS_MAP[row.status];
      if (key) statusBreakdown[key] += count;
    }

    return { totalBookings, statusBreakdown };
  }

  private aggregateReportData(reportData: Array<{ reason: string; _count: { id: number } }>) {
    const reportsByReason = { spam: 0, dontKnowPerson: 0, other: 0 };
    let reportCount = 0;

    for (const row of reportData) {
      const count = row._count.id;
      reportCount += count;
      if (row.reason === BookingReportReason.SPAM) reportsByReason.spam += count;
      else if (row.reason === BookingReportReason.DONT_KNOW_PERSON) reportsByReason.dontKnowPerson += count;
      else reportsByReason.other += count;
    }

    return { reportCount, reportsByReason };
  }

  private async resolveAffectedOrgs({
    orgResult,
    bookerEmail,
    isExactEmail,
    thirtyDaysAgo,
  }: {
    orgResult: { topOrgs: Array<{ organizationId: number; bookingCount: number }>; totalOrgCount: number };
    bookerEmail: string;
    isExactEmail: boolean;
    thirtyDaysAgo: Date;
  }) {
    const orgIds = orgResult.topOrgs.map((r) => r.organizationId);

    const [orgNames, reportCountsPerOrg] = await Promise.all([
      this.deps.watchlistRepo.findTeamNamesByIds(orgIds),
      this.deps.bookingReportRepo.countReportsPerOrg({
        email: bookerEmail,
        isExactEmail,
        orgIds,
        since: thirtyDaysAgo,
      }),
    ]);

    const orgNameMap = new Map(orgNames.map((o) => [o.id, o.name]));

    return {
      affectedOrgCount: orgResult.totalOrgCount,
      topAffectedOrgs: orgResult.topOrgs.map((r) => ({
        id: r.organizationId,
        name: orgNameMap.get(r.organizationId) ?? "Unknown",
        bookingCount: r.bookingCount,
        reportCount: reportCountsPerOrg.get(r.organizationId) ?? 0,
      })),
    };
  }
}
