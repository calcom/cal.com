import type { WatchlistType } from "../types";

export interface BlockingResult {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: Record<string, unknown> | null;
}

/**
 * Result of batch blocking check.
 * Maps email (lowercase) -> BlockingResult
 */
export type BatchBlockingResult = Map<string, BlockingResult>;

export interface IBlockingService {
  /**
   * Check if a single email is blocked.
   */
  isBlocked(email: string, organizationId?: number | null): Promise<BlockingResult>;

  /**
   * Batch check multiple emails in a single query.
   * Returns Map<email, BlockingResult> for efficient lookup.
   */
  areBlocked(emails: string[], organizationId?: number | null): Promise<BatchBlockingResult>;
}
