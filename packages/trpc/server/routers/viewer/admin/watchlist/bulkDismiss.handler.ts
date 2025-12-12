import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import { WatchlistError, WatchlistErrorCode } from "@calcom/features/watchlist/lib/errors/WatchlistErrors";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TBulkDismissReportsInputSchema } from "./bulkDismiss.schema";

type BulkDismissReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkDismissReportsInputSchema;
};

export const bulkDismissReportsHandler = async ({ input }: BulkDismissReportsOptions) => {
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.bulkDismissReports({
      reportIds: input.reportIds,
    });
  } catch (error) {
    if (error instanceof WatchlistError) {
      switch (error.code) {
        case WatchlistErrorCode.BULK_DELETE_PARTIAL_FAILURE:
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
      message: "Failed to dismiss reports",
    });
  }
};
