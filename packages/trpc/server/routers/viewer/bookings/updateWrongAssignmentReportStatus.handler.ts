import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateWrongAssignmentReportStatusInputSchema } from "./updateWrongAssignmentReportStatus.schema";

type UpdateWrongAssignmentReportStatusOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateWrongAssignmentReportStatusInputSchema;
};

export const updateWrongAssignmentReportStatusHandler = async ({
  ctx,
  input,
}: UpdateWrongAssignmentReportStatusOptions) => {
  const { user } = ctx;
  const { reportId, status } = input;

  const repo = new WrongAssignmentReportRepository(prisma);

  const report = await repo.findById(reportId);

  if (!report) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Report not found",
    });
  }

  if (!report.teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Report is not associated with a team",
    });
  }

  const membershipRepository = new MembershipRepository();
  const hasMembership = await membershipRepository.hasMembership({ userId: user.id, teamId: report.teamId });

  if (!hasMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You don't have access to this team",
    });
  }

  const updatedReport = await repo.updateStatus({
    id: reportId,
    status,
    reviewedById: user.id,
  });

  return {
    success: true,
    report: updatedReport,
  };
};
