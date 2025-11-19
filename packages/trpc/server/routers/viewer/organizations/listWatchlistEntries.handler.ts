import { getOrganizationWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListWatchlistEntriesInputSchema } from "./listWatchlistEntries.schema";

type ListWatchlistEntriesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListWatchlistEntriesInputSchema;
};

export const listWatchlistEntriesHandler = async ({ ctx, input }: ListWatchlistEntriesOptions) => {
  const { user } = ctx;

  const organizationId = user.profile?.organizationId || user.organizationId;
  if (!organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be part of an organization to manage blocklist",
    });
  }

  const service = getOrganizationWatchlistQueryService();

  try {
    return await service.listWatchlistEntries({
      organizationId,
      userId: user.id,
      limit: input.limit,
      offset: input.offset,
      searchTerm: input.searchTerm,
      filters: input.filters,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An error occurred";

    if (message.includes("not authorized")) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to list blocklist entries",
    });
  }
};

export default listWatchlistEntriesHandler;
