import { getAdminWatchlistOperationsService } from "@calcom/features/di/watchlist/containers/watchlist";
import type { TrpcSessionUser } from "../../../../types";
import type { TAddToWatchlistInputSchema } from "./addToWatchlist.schema";

type AddToWatchlistOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddToWatchlistInputSchema;
};

export const addToWatchlistHandler = async ({ ctx, input }: AddToWatchlistOptions) => {
  const service = getAdminWatchlistOperationsService();
  return service.addToWatchlistByEmail({
    email: input.email,
    type: input.type,
    description: input.description,
    userId: ctx.user.id,
  });
};
