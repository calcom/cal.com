import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

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
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("not found")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message,
      });
    }

    if (message.includes("already been added to the blocklist")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to dismiss report",
    });
  }
};

export default dismissReportHandler;
