import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TBulkDismissReportsInputSchema } from "./bulkDismiss.schema";

type BulkDismissReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkDismissReportsInputSchema;
};

export const bulkDismissReportsHandler = async ({ input }: BulkDismissReportsOptions) => {
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  const reports = await bookingReportRepo.findReportsByIds({
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
    const result = await bookingReportRepo.bulkUpdateReportStatus({
      reportIds: validReportIds,
      status: "DISMISSED",
    });
    successCount = result.updated;
  }

  if (successCount === 0 && failed.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to dismiss all reports: ${failed[0].reason}`,
    });
  }

  return {
    success: successCount,
    failed: failed.length,
    message:
      failed.length === 0
        ? "All reports dismissed successfully"
        : `Dismissed ${successCount} reports, ${failed.length} failed`,
  };
};

export default bulkDismissReportsHandler;
