import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TDismissReportInputSchema } from "./dismissReport.schema";

type DismissReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDismissReportInputSchema;
};

export const dismissReportHandler = async ({ input }: DismissReportOptions) => {
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  // Validate report exists (no org filtering - admin can access any report)
  const reports = await bookingReportRepo.findReportsByIds({
    reportIds: [input.reportId],
  });

  if (reports.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Report not found",
    });
  }

  const report = reports[0];

  if (report.watchlistId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot dismiss a report that has already been added to the blocklist",
    });
  }

  await bookingReportRepo.updateReportStatus({
    reportId: input.reportId,
    status: "DISMISSED",
  });

  return { success: true };
};

export default dismissReportHandler;
