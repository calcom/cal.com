import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ input }: GetWatchlistEntryDetailsOptions) => {
  const service = getAdminWatchlistQueryService();

  try {
    return await service.getWatchlistEntryDetails({
      entryId: input.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("not found")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message,
      });
    }

    if (message.includes("only view system blocklist entries")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get blocklist entry details",
    });
  }
};

export default getWatchlistEntryDetailsHandler;
