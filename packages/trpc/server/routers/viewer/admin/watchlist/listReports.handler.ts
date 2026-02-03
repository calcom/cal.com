import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";

import type { TrpcSessionUser } from "../../../../types";
import type { TListReportsInputSchema } from "./listReports.schema";

type ListReportsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListReportsInputSchema;
};

export const listReportsHandler = async ({ input }: ListReportsOptions) => {
  const service = getAdminWatchlistQueryService();

  return await service.listBookingReports({
    limit: input.limit,
    offset: input.offset,
    searchTerm: input.searchTerm,
    filters: input.filters,
    systemFilters: input.systemFilters,
    sortBy: input.sortBy,
  });
};
