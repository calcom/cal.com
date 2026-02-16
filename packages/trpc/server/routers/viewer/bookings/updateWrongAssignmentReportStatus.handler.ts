import { WrongAssignmentReportRepository } from "@calcom/features/bookings/repositories/WrongAssignmentReportRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
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

  const report = await repo.findTeamIdById(reportId);

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

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: report.teamId,
    permission: "booking.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) {
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
