import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TListBookingReportsInputSchema } from "./listBookingReports.schema";

type ListBookingReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListBookingReportsInputSchema;
};

export const listBookingReportsHandler = async ({ ctx, input }: ListBookingReportsOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to view booking reports",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to view booking reports",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  const result = await bookingReportRepo.findGroupedReportedBookings({
    organizationId,
    skip: input.offset,
    take: input.limit,
    searchTerm: input.searchTerm,
    filters: input.filters,
    sortBy: input.sortBy,
  });

  return result;
};

export default listBookingReportsHandler;
