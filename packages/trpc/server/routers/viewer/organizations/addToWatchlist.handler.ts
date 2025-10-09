import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
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
      message: "You must be part of an organization to manage watchlist",
    });
  }

  const bookingReportRepo = new PrismaBookingReportRepository(prisma);
  const watchlistRepo = new WatchlistRepository(prisma);

  const reports = await bookingReportRepo.findAllReportedBookings({
    organizationId,
    skip: 0,
    take: 1,
    filters: undefined,
  });

  const report = reports.rows.find((r) => r.id === input.reportId);
  if (!report) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Booking report not found or does not belong to your organization",
    });
  }

  if (report.watchlistId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This booker is already in the watchlist",
    });
  }

  try {
    const watchlist = await watchlistRepo.createEntry({
      type: input.type,
      value: input.value,
      organizationId,
      action: input.action,
      description: input.description,
      userId: user.id,
    });

    await bookingReportRepo.linkWatchlistToReport({
      reportId: input.reportId,
      watchlistId: watchlist.id,
    });

    return {
      success: true,
      message: "Successfully added to watchlist",
      watchlistId: watchlist.id,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This entry already exists in the watchlist for your organization",
      });
    }
    throw error;
  }
};

export default addToWatchlistHandler;
