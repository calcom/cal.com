import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole, WatchlistAction, WatchlistType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { THandleBookingReportInputSchema } from "./handleBookingReport.schema";

type HandleBookingReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: THandleBookingReportInputSchema;
};

export const handleBookingReportHandler = async ({ ctx, input }: HandleBookingReportOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to handle booking reports",
    });
  }

  const permissionCheckService = new PermissionCheckService();
  const hasPermission = await permissionCheckService.checkPermission({
    userId: user.id,
    teamId: organizationId,
    permission: "watchlist.create",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to handle booking reports",
    });
  }

  const watchlistRepo = new WatchlistRepository(prisma);

  const report = await prisma.bookingReport.findUnique({
    where: { id: input.reportId },
    select: {
      id: true,
      bookerEmail: true,
      organizationId: true,
    },
  });

  if (!report || report.organizationId !== organizationId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking report not found",
    });
  }

  const email = report.bookerEmail.toLowerCase();
  const domain = email.split("@")[1];

  try {
    let watchlistId: string;

    if (input.action === "ignore") {
      const ignoredEntry = await watchlistRepo.createEntry({
        type: WatchlistType.EMAIL,
        value: email,
        organizationId,
        action: WatchlistAction.REPORT,
        description: "Ignored report - no action taken",
        userId: user.id,
      });
      watchlistId = ignoredEntry.id;
    } else if (input.action === "block_email") {
      const entry = await watchlistRepo.createEntry({
        type: WatchlistType.EMAIL,
        value: email,
        organizationId,
        action: WatchlistAction.BLOCK,
        description: `Blocked from booking report`,
        userId: user.id,
      });
      watchlistId = entry.id;
    } else {
      const entry = await watchlistRepo.createEntry({
        type: WatchlistType.DOMAIN,
        value: domain,
        organizationId,
        action: WatchlistAction.BLOCK,
        description: `Blocked from booking report`,
        userId: user.id,
      });
      watchlistId = entry.id;
    }

    await prisma.bookingReport.update({
      where: { id: input.reportId },
      data: { watchlistId },
    });

    return {
      success: true,
      message:
        input.action === "ignore"
          ? "report_ignored_successfully"
          : input.action === "block_email"
          ? "email_blocked_successfully"
          : "domain_blocked_successfully",
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      const existingEntry = await watchlistRepo.checkExists({
        type: input.action === "block_domain" ? WatchlistType.DOMAIN : WatchlistType.EMAIL,
        value: input.action === "block_domain" ? domain : email,
        organizationId,
      });

      if (existingEntry) {
        await prisma.bookingReport.update({
          where: { id: input.reportId },
          data: { watchlistId: existingEntry.id },
        });
      }

      return {
        success: true,
        message:
          input.action === "ignore"
            ? "report_ignored_successfully"
            : input.action === "block_email"
            ? "email_was_already_blocked"
            : "domain_was_already_blocked",
      };
    }
    throw error;
  }
};

export default handleBookingReportHandler;
