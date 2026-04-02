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

  const service = getOrganizationWatchlistOperationsService(organizationId);
  return service.addToWatchlistByEmail({
    email: input.email,
    type: input.type,
    description: input.description,
    userId: user.id,
  });
};
