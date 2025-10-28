import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TDeleteBookingReportInputSchema } from "./deleteBookingReport.schema";

type DeleteBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteBookingReportInputSchema;
};

export const deleteBookingReportHandler = async ({ ctx, input }: DeleteBookingReportOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to delete booking reports",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.delete",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to delete booking reports",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  await bookingReportRepo.deleteReport({
    reportId: input.reportId,
    organizationId,
  });

  return { success: true };
};

export default deleteBookingReportHandler;
