import type { WatchlistType } from "../types";

export interface BlockingResult {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: Record<string, unknown> | null;
}

export interface IBlockingService {
  isBlocked(email: string, organizationId?: number | null): Promise<BlockingResult>;
}
