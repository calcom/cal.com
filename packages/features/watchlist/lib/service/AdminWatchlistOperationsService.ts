import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import logger from "@calcom/lib/logger";
import { SystemReportStatus, WatchlistType } from "@calcom/prisma/enums";

import { WatchlistErrors } from "../errors/WatchlistErrors";
import { extractDomainFromEmail, normalizeEmail } from "../utils/normalization";
import type {
  AddReportsToWatchlistResult,
  DeleteWatchlistEntryInput,
  DeleteWatchlistEntryResult,
  WatchlistOperationsScope,
} from "./WatchlistOperationsService";
import { WatchlistOperationsService } from "./WatchlistOperationsService";

export interface BulkDeleteWatchlistEntriesInput {
  entryIds: string[];
  userId: number;
}

export interface BulkDeleteWatchlistEntriesResult {
  success: number;
  failed: number;
  message: string;
}

export interface BulkDismissReportsResult {
  success: number;
  failed: number;
  message: string;
}

export interface AddToWatchlistByEmailInput {
  email: string;
  type: WatchlistType;
  description?: string;
  userId: number;
}

export interface DismissReportByEmailInput {
  email: string;
}

export interface DismissReportByEmailResult {
  success: boolean;
  count: number;
}

export interface BulkDismissReportsByEmailInput {
  emails: string[];
}

type Deps = {
  watchlistRepo: WatchlistRepository;
  bookingReportRepo: PrismaBookingReportRepository;
};

export class AdminWatchlistOperationsService extends WatchlistOperationsService {
  private adminLog = logger.getSubLogger({ prefix: ["AdminWatchlistOperationsService"] });

  constructor(deps: Deps) {
    super(deps);
  }

  protected getScope(): WatchlistOperationsScope {
    return {
      organizationId: null,
      isGlobal: true,
    };
  }

  async bulkDeleteWatchlistEntries(
    input: BulkDeleteWatchlistEntriesInput
  ): Promise<BulkDeleteWatchlistEntriesResult> {
    const entries = await this.deps.watchlistRepo.findEntriesByIds(input.entryIds);

    const entryMap = new Map(entries.map((e) => [e.id, e]));
    const validIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const id of input.entryIds) {
      const entry = entryMap.get(id);

      if (!entry) {
        failed.push({ id, reason: "Entry not found" });
        continue;
      }

      if (!entry.isGlobal || entry.organizationId !== null) {
        failed.push({ id, reason: "Can only delete system blocklist entries" });
        continue;
      }

      validIds.push(id);
    }

    let successCount = 0;
    if (validIds.length > 0) {
      const result = await this.deps.watchlistRepo.bulkDeleteEntries({
        ids: validIds,
        userId: input.userId,
      });
      successCount = result.deleted;
    }

    if (successCount === 0 && failed.length > 0) {
      this.adminLog.error("Bulk delete watchlist entries failures", { failed });
      throw WatchlistErrors.bulkDeletePartialFailure(`Failed to delete all entries: ${failed[0].reason}`);
    }

    return {
      success: successCount,
      failed: failed.length,
      message:
        failed.length === 0
          ? "All entries deleted successfully"
          : `Deleted ${successCount} entries, ${failed.length} failed`,
    };
  }

  async deleteWatchlistEntry(input: DeleteWatchlistEntryInput): Promise<DeleteWatchlistEntryResult> {
    const { entry } = await this.deps.watchlistRepo.findEntryWithAuditAndReports(input.entryId);

    if (!entry) {
      throw WatchlistErrors.notFound("Blocklist entry not found");
    }

    if (!entry.isGlobal || entry.organizationId !== null) {
      throw WatchlistErrors.permissionDenied("You can only delete system blocklist entries");
    }

    await this.deps.watchlistRepo.deleteEntry(input.entryId, input.userId);

    return {
      success: true,
      message: "Entry deleted successfully",
    };
  }

  async addToWatchlistByEmail(input: AddToWatchlistByEmailInput): Promise<AddReportsToWatchlistResult> {
    const scope = this.getScope();

    let watchlistValue: string;
    let reports: Array<{ id: string; bookerEmail: string; globalWatchlistId: string | null }>;

    if (input.type === WatchlistType.EMAIL) {
      watchlistValue = normalizeEmail(input.email);
      reports = await this.deps.bookingReportRepo.findPendingSystemReportsByEmail({
        email: watchlistValue,
      });
    } else {
      watchlistValue = extractDomainFromEmail(input.email);
      reports = await this.deps.bookingReportRepo.findPendingSystemReportsByDomain({
        domain: watchlistValue,
      });
    }

    const { watchlistEntry } = await this.deps.watchlistRepo.createEntryFromReport({
      type: input.type,
      value: watchlistValue,
      organizationId: scope.organizationId,
      isGlobal: scope.isGlobal,
      userId: input.userId,
      description: input.description,
    });

    if (reports.length > 0) {
      await this.deps.bookingReportRepo.bulkLinkGlobalWatchlistWithSystemStatus({
        links: reports.map((r) => ({ reportId: r.id, globalWatchlistId: watchlistEntry.id })),
        systemStatus: SystemReportStatus.BLOCKED,
      });
    }

    return {
      success: true,
      message: `Successfully added ${input.type === WatchlistType.EMAIL ? "email" : "domain"} to global blocklist`,
      addedCount: reports.length,
      skippedCount: 0,
      results: reports.map((r) => ({ reportId: r.id, watchlistId: watchlistEntry.id })),
    };
  }

  async dismissReportByEmail(input: DismissReportByEmailInput): Promise<DismissReportByEmailResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const result = await this.deps.bookingReportRepo.dismissSystemReportsByEmail({
      email: normalizedEmail,
      systemStatus: SystemReportStatus.DISMISSED,
    });

    if (result.count === 0) {
      throw WatchlistErrors.notFound("No pending reports found for this email");
    }

    return { success: true, count: result.count };
  }

  async bulkDismissReportsByEmail(input: BulkDismissReportsByEmailInput): Promise<BulkDismissReportsResult> {
    const results = await Promise.all(
      input.emails.map(async (email) => {
        const normalizedEmail = normalizeEmail(email);
        return this.deps.bookingReportRepo.dismissSystemReportsByEmail({
          email: normalizedEmail,
          systemStatus: SystemReportStatus.DISMISSED,
        });
      })
    );

    const totalDismissed = results.reduce((sum, r) => sum + r.count, 0);

    return {
      success: totalDismissed,
      failed: 0,
      message:
        totalDismissed === 0
          ? "No pending reports found"
          : `Dismissed ${totalDismissed} report(s) successfully`,
    };
  }
}
