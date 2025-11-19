import { getOrganizationWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetWatchlistEntryDetailsInputSchema } from "./getWatchlistEntryDetails.schema";

type GetWatchlistEntryDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetWatchlistEntryDetailsInputSchema;
};

export const getWatchlistEntryDetailsHandler = async ({ ctx, input }: GetWatchlistEntryDetailsOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to view blocklist",
    });
  }

  const service = getOrganizationWatchlistQueryService();

  try {
    return await service.getWatchlistEntryDetails({
      organizationId,
      userId: user.id,
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

    if (message.includes("not authorized")) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message,
      });
    }

    if (message.includes("only view blocklist entries from your organization")) {
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
