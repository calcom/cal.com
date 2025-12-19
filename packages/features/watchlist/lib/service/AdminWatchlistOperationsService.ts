import type { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import type { WatchlistRepository } from "@calcom/features/watchlist/lib/repository/WatchlistRepository";
import logger from "@calcom/lib/logger";
import { BookingReportStatus } from "@calcom/prisma/enums";

import { WatchlistErrors } from "../errors/WatchlistErrors";
import type {
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

export interface DismissReportInput {
  reportId: string;
}

export interface DismissReportResult {
  success: boolean;
}

export interface BulkDismissReportsInput {
  reportIds: string[];
}

export interface BulkDismissReportsResult {
  success: number;
  failed: number;
  message: string;
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

  protected async findReports(
    reportIds: string[]
  ): Promise<Array<{ id: string; bookerEmail: string; watchlistId: string | null }>> {
    const reports = await this.deps.bookingReportRepo.findReportsByIds({
      reportIds,
    });

    return reports;
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
      // TODO: use translate keys in follow up frontend PR
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

  async dismissReport(input: DismissReportInput): Promise<DismissReportResult> {
    const reports = await this.deps.bookingReportRepo.findReportsByIds({
      reportIds: [input.reportId],
    });

    if (reports.length === 0) {
      throw WatchlistErrors.notFound("Report not found");
    }

    const report = reports[0];

    if (report.watchlistId) {
      throw WatchlistErrors.validationError(
        "Cannot dismiss a report that has already been added to the blocklist"
      );
    }

    await this.deps.bookingReportRepo.updateReportStatus({
      reportId: input.reportId,
      status: BookingReportStatus.DISMISSED,
    });

    return { success: true };
  }

  async bulkDismissReports(input: BulkDismissReportsInput): Promise<BulkDismissReportsResult> {
    const reports = await this.deps.bookingReportRepo.findReportsByIds({
      reportIds: input.reportIds,
    });

    const reportMap = new Map(reports.map((r) => [r.id, r]));
    const validReportIds: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    for (const reportId of input.reportIds) {
      const report = reportMap.get(reportId);

      if (!report) {
        failed.push({ id: reportId, reason: "Report not found" });
        continue;
      }

      if (report.watchlistId) {
        failed.push({ id: reportId, reason: "Already added to blocklist" });
        continue;
      }

      validReportIds.push(reportId);
    }

    let successCount = 0;
    if (validReportIds.length > 0) {
      const result = await this.deps.bookingReportRepo.bulkUpdateReportStatus({
        reportIds: validReportIds,
        status: BookingReportStatus.DISMISSED,
      });
      successCount = result.updated;
    }

    if (successCount === 0 && failed.length > 0) {
      this.adminLog.error("Bulk dismiss reports failures", { failed });
      throw WatchlistErrors.bulkDeletePartialFailure(`Failed to dismiss all reports: ${failed[0].reason}`);
    }

    return {
      success: successCount,
      failed: failed.length,
      message:
        failed.length === 0
          ? "All reports dismissed successfully"
          : `Dismissed ${successCount} reports, ${failed.length} failed`,
    };
  }
}
