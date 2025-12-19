import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type PendingReportsCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const pendingReportsCountHandler = async ({ ctx }: PendingReportsCountOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    return 0;
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    return 0;
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  return bookingReportRepo.countPendingReports({ organizationId });
};

export default pendingReportsCountHandler;
