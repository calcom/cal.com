import { getOrganizationWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";

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
      message: "You must be part of an organization to add to watchlist",
    });
  }

  const service = getOrganizationWatchlistOperationsService();

  try {
    return await service.addReportsToWatchlistInternal({
      reportIds: input.reportIds,
      type: input.type,
      description: input.description,
      userId: user.id,
      organizationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("not authorized")) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message,
      });
    }

    if (message.includes("not found")) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message,
      });
    }

    if (message.includes("already in the watchlist") || message.includes("Invalid email") || message.includes("already exists")) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }

    throw error;
  }
};

export default addToWatchlistHandler;
