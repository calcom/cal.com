import { getAdminWatchlistQueryService } from "@calcom/features/di/watchlist/containers/watchlist";

export const pendingReportsCountHandler = async () => {
  const service = getAdminWatchlistQueryService();
  return await service.getPendingReportsCount();
};
