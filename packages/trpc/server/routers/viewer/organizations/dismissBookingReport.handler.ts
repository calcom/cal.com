import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDismissBookingReportInputSchema } from "./dismissBookingReport.schema";

type DismissBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDismissBookingReportInputSchema;
};

export const dismissBookingReportHandler = async ({ ctx, input }: DismissBookingReportOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to dismiss booking reports",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.update",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to dismiss booking reports",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  const reports = await bookingReportRepo.findReportsByIds({
    reportIds: [input.reportId],
    organizationId,
  });

  if (reports.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking report not found",
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
    organizationId,
  });

  return { success: true };
};

export default dismissBookingReportHandler;
