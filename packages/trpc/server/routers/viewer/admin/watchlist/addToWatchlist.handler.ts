import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

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
  const service = getAdminWatchlistOperationsService();

  try {
    return await service.addReportsToWatchlist({
      reportIds: input.reportIds,
      type: input.type,
      description: input.description,
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("not found")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message,
      });
    }

    if (message.includes("already in the watchlist") || message.includes("Invalid email")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw error;
  }
};

export default addToWatchlistHandler;
