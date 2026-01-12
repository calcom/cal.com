import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { WatchlistEntry } from "@calcom/features/watchlist/lib/repository/IWatchlistRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import { domainRegex, emailRegex } from "@calcom/lib/emailSchema";
import logger from "@calcom/lib/logger";
import { WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import { WatchlistErrors } from "../errors/WatchlistErrors";
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
  private log = logger.getSubLogger({ prefix: ["WatchlistOperationsService"] });

  constructor(protected readonly deps: Deps) {}

  protected abstract getScope(): WatchlistOperationsScope;

  protected abstract findReports(
    reportIds: string[]
  ): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>>;

  validateEmailOrDomain(type: WatchlistType, value: string): void {
    if (type === WatchlistType.EMAIL && !emailRegex.test(value)) {
      throw WatchlistErrors.invalidEmail("Invalid email address format");
    }

    if (type === WatchlistType.DOMAIN && !domainRegex.test(value)) {
      throw WatchlistErrors.invalidDomain("Invalid domain format (e.g., example.com)");
    }
  }

  async addReportsToWatchlist(input: AddReportsToWatchlistInput): Promise<AddReportsToWatchlistResult> {
    const scope = this.getScope();

    const validReports = await this.findReports(input.reportIds);

    if (validReports.length !== input.reportIds.length) {
      const foundIds = new Set(validReports.map((r) => r.id));
      const missingIds = input.reportIds.filter((id) => !foundIds.has(id));
      throw WatchlistErrors.notFound(`Report(s) not found: ${missingIds.join(", ")}`);
    }

    const reportsToAdd = validReports.filter((report) => !report.watchlistId);

    if (reportsToAdd.length === 0) {
      throw WatchlistErrors.alreadyInWatchlist("All selected reports are already in the watchlist");
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
      this.log.error("Email normalization failed", {
        error: error instanceof Error ? error.message : String(error),
        reportIds: reportsToAdd.map((r) => r.id),
      });
      throw WatchlistErrors.invalidEmail(error instanceof Error ? error.message : "Invalid email format");
    }

    const results = await Promise.all(
      reportsToAdd.map(async (report) => {
        const normalizedValue = normalizedValues.get(report.id);
        if (!normalizedValue) {
          throw new Error("Unable to process the selected report. Please try again.");
        }

        const { watchlistEntry } = await this.deps.watchlistRepo.createEntryFromReport({
          type: input.type,
          value: normalizedValue,
          organizationId: scope.organizationId,
          isGlobal: scope.isGlobal,
          userId: input.userId,
          description: input.description,
        });

        return {
          reportId: report.id,
          watchlistId: watchlistEntry.id,
        };
      })
    );

    await this.deps.bookingReportRepo.bulkLinkWatchlistWithStatus({
      links: results.map((r) => ({ reportId: r.reportId, watchlistId: r.watchlistId })),
      status: "BLOCKED",
    });

    return {
      success: true,
      message: `Successfully added ${results.length} report(s) to watchlist`,
      addedCount: results.length,
      skippedCount: validReports.length - reportsToAdd.length,
      results,
    };
  }

  async createWatchlistEntry(input: CreateWatchlistEntryInput): Promise<CreateWatchlistEntryResult> {
    const scope = this.getScope();

    this.validateEmailOrDomain(input.type, input.value);

    const entry = await this.deps.watchlistRepo.createEntryIfNotExists({
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
