import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import type { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import type { WatchlistEntry } from "@calcom/lib/server/repository/watchlist.interface";
import type { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import { extractDomainFromEmail, normalizeEmail } from "../utils/normalization";

export interface AddReportsToWatchlistInput {
  reportIds: string[];
  type: WatchlistType;
  description?: string;
  userId: number;
}

export interface AddReportsToWatchlistResult {
  success: boolean;
  message: string;
  addedCount: number;
  skippedCount: number;
  results: Array<{ reportId: string; watchlistId: string }>;
}

export interface CreateWatchlistEntryInput {
  type: WatchlistType;
  value: string;
  description?: string;
  userId: number;
}

export interface CreateWatchlistEntryResult {
  success: boolean;
  entry: WatchlistEntry;
}

export interface DeleteWatchlistEntryInput {
  entryId: string;
  userId: number;
}

export interface DeleteWatchlistEntryResult {
  success: boolean;
  message: string;
}

export interface WatchlistOperationsScope {
  organizationId: number | null;
  isGlobal: boolean;
}

type Deps = {
  watchlistRepo: WatchlistRepository;
  bookingReportRepo: PrismaBookingReportRepository;
};

export abstract class WatchlistOperationsService {
  constructor(protected readonly deps: Deps) {}

  protected abstract getScope(
    input: AddReportsToWatchlistInput | CreateWatchlistEntryInput | DeleteWatchlistEntryInput
  ): WatchlistOperationsScope;

  protected abstract validateReports(
    reportIds: string[]
  ): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>>;

  validateEmailOrDomain(type: WatchlistType, value: string): void {
    if (type === WatchlistType.EMAIL && !emailRegex.test(value)) {
      throw new Error("Invalid email address format");
    }

    if (type === WatchlistType.DOMAIN && !domainRegex.test(value)) {
      throw new Error("Invalid domain format (e.g., example.com)");
    }
  }

  async addReportsToWatchlist(input: AddReportsToWatchlistInput): Promise<AddReportsToWatchlistResult> {
    const scope = this.getScope(input);

    const validReports = await this.validateReports(input.reportIds);

    if (validReports.length !== input.reportIds.length) {
      const foundIds = validReports.map((r) => r.id);
      const missingIds = input.reportIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Report(s) not found: ${missingIds.join(", ")}`);
    }

    const reportsToAdd = validReports.filter((report) => !report.watchlistId);

    if (reportsToAdd.length === 0) {
      throw new Error("All selected reports are already in the watchlist");
    }

    const normalizedValues = new Map<string, string>();
    try {
      for (const report of reportsToAdd) {
        const value =
          input.type === WatchlistType.EMAIL
            ? normalizeEmail(report.bookerEmail)
            : extractDomainFromEmail(report.bookerEmail);
        normalizedValues.set(report.id, value);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid email format");
    }

    const result = await this.deps.watchlistRepo.addReportsToWatchlist({
      reportIds: reportsToAdd.map((r) => r.id),
      type: input.type,
      normalizedValues,
      organizationId: scope.organizationId,
      isGlobal: scope.isGlobal,
      userId: input.userId,
      description: input.description,
      bookingReportRepo: this.deps.bookingReportRepo,
    });

    return {
      success: true,
      message: `Successfully added ${result.success} report(s) to watchlist`,
      addedCount: result.success,
      skippedCount: result.skipped,
      results: result.results.map((r) => ({ reportId: r.reportId, watchlistId: r.watchlistId })),
    };
  }

  async createWatchlistEntry(input: CreateWatchlistEntryInput): Promise<CreateWatchlistEntryResult> {
    const scope = this.getScope(input);

    this.validateEmailOrDomain(input.type, input.value);

    const entry = await this.deps.watchlistRepo.createEntry({
      type: input.type,
      value: input.value.toLowerCase(),
      organizationId: scope.organizationId,
      action: WatchlistAction.BLOCK,
      description: input.description,
      userId: input.userId,
      isGlobal: scope.isGlobal,
    });

    return {
      success: true,
      entry,
    };
  }

  async deleteWatchlistEntry(input: DeleteWatchlistEntryInput): Promise<DeleteWatchlistEntryResult> {
    await this.deps.watchlistRepo.deleteEntry(input.entryId, input.userId);

    return {
      success: true,
      message: "Entry deleted successfully",
    };
  }
}
