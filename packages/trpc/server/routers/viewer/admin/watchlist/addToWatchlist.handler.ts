import { normalizeEmail, extractDomainFromEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import { WatchlistRepository } from "@calcom/lib/server/repository/watchlist.repository";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TAddToWatchlistInputSchema } from "./addToWatchlist.schema";

type AddToWatchlistOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddToWatchlistInputSchema;
};

export const addToWatchlistHandler = async ({ ctx, input }: AddToWatchlistOptions) => {
  const { user } = ctx;
  const watchlistRepo = new WatchlistRepository(prisma);
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);

  // Validate reports exist (no org filtering - admin can access any report)
  const reports = await bookingReportRepo.findReportsByIds({
    reportIds: input.reportIds,
  });

  if (reports.length !== input.reportIds.length) {
    const foundIds = reports.map((r) => r.id);
    const missingIds = input.reportIds.filter((id) => !foundIds.includes(id));
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Report(s) not found: ${missingIds.join(", ")}`,
    });
  }

  const reportsToAdd = reports.filter((report) => !report.watchlistId);

  if (reportsToAdd.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "All selected reports are already in the blocklist",
    });
  }

  const normalizedValues = new Map<string, string>();
  try {
    for (const report of reportsToAdd) {
      const value =
        input.type === "EMAIL"
          ? normalizeEmail(report.bookerEmail)
          : extractDomainFromEmail(report.bookerEmail);
      normalizedValues.set(report.id, value);
    }
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid email format",
    });
  }

  const result = await watchlistRepo.addReportsToWatchlist({
    reportIds: reportsToAdd.map((r) => r.id),
    type: input.type,
    normalizedValues,
    organizationId: null, // System-wide
    isGlobal: true, // System-wide
    userId: user.id,
    description: input.description,
    bookingReportRepo,
  });

  return {
    success: true,
    message: `Successfully added ${result.success} report(s) to system blocklist`,
    addedCount: result.success,
    skippedCount: result.skipped,
    results: result.results.map((r) => ({ reportId: r.reportId, watchlistId: r.watchlistId })),
  };
};

export default addToWatchlistHandler;
