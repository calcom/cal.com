import type { BlockingResult } from "../interfaces/IBlockingService";
import type { IWatchlistReadRepository } from "../interfaces/IWatchlistRepository";
import type { IBlockingStrategy } from "./IBlockingStrategy";

export class EmailBlockingStrategy implements IBlockingStrategy {
  constructor(private readonly watchlistRepo: IWatchlistReadRepository) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const entry = await this.watchlistRepo.findBlockedEntry(email, organizationId);

    return {
      isBlocked: !!entry,
      reason: entry ? "email" : undefined,
      watchlistEntry: entry,
    };
  }
}
