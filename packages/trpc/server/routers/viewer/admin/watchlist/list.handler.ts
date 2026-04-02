import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";
import type { TrpcSessionUser } from "../../../../types";
import type { TListWatchlistEntriesInputSchema } from "./list.schema";

type ListWatchlistEntriesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListWatchlistEntriesInputSchema;
};

export const listWatchlistEntriesHandler = async ({ input }: ListWatchlistEntriesOptions) => {
  const service = getAdminWatchlistQueryService();

  return await service.listWatchlistEntries({
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
  });
};
