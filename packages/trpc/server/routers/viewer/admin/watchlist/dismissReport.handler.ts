import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TDismissReportInputSchema } from "./dismissReport.schema";

type DismissReportOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDismissReportInputSchema;
};

export const dismissReportHandler = async ({ input }: DismissReportOptions) => {
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.dismissReport({
      reportId: input.reportId,
    });
  } catch (error) {
    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.NOT_FOUND:
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        case WatchlistErrorCode.VALIDATION_ERROR:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to dismiss report",
    });
  }
};
