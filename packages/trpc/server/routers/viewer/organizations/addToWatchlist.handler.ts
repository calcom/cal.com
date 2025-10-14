import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";
import { WatchlistAction } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddToWatchlistInputSchema } from "./addToWatchlist.schema";

type AddToWatchlistOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddToWatchlistInputSchema;
};

export const addToWatchlistHandler = async ({ ctx, input }: AddToWatchlistOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage blocklist",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);
  const watchlistRepo = new WatchlistRepository(prisma);

  const validReports = await bookingReportRepo.findReportsByIds({
    reportIds: input.reportIds,
    organizationId,
  });

  if (validReports.length !== input.reportIds.length) {
    const foundIds = validReports.map((r) => r.id);
    const missingIds = input.reportIds.filter((id) => !foundIds.includes(id));
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Booking report(s) not found or do not belong to your organization: ${missingIds.join(", ")}`,
    });
  }

  const reportsToAdd = validReports.filter((report) => !report.watchlistId);

  if (reportsToAdd.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "All selected bookers are already in the watchlist",
    });
  }

  try {
    const results = await Promise.all(
      reportsToAdd.map(async (report) => {
        const value =
          input.type === "EMAIL"
            ? report.bookerEmail
            : report.bookerEmail.split("@")[1] || report.bookerEmail;

        const existingWatchlist = await watchlistRepo.checkExists({
          type: input.type,
          value,
          organizationId,
        });

        let watchlistId: string;

        if (existingWatchlist) {
          watchlistId = existingWatchlist.id;
        } else {
          const newWatchlist = await watchlistRepo.createEntry({
            type: input.type,
            value,
            organizationId,
            action: WatchlistAction.BLOCK,
            description: input.description,
            userId: user.id,
          });
          watchlistId = newWatchlist.id;
        }

        await bookingReportRepo.linkWatchlistToReport({
          reportId: report.id,
          watchlistId,
        });

        return { reportId: report.id, watchlistId, value };
      })
    );

    return {
      success: true,
      message: `Successfully added ${reportsToAdd.length} report(s) to watchlist`,
      addedCount: reportsToAdd.length,
      skippedCount: validReports.length - reportsToAdd.length,
      results: results.map((r) => ({ reportId: r.reportId, watchlistId: r.watchlistId })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This entry already exists in the blocklist for your organization",
      });
    }
    throw error;
  }
};

export default addToWatchlistHandler;
