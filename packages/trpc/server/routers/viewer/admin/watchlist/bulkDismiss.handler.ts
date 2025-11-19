import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

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
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("Failed to dismiss all reports")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to dismiss reports",
    });
  }
};

export default bulkDismissReportsHandler;
