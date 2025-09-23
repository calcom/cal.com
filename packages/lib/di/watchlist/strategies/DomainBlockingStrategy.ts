import type { BlockingResult } from "../interfaces/IBlockingService";
import type { IWatchlistReadRepository } from "../interfaces/IWatchlistRepositories";
import type { IBlockingStrategy } from "./IBlockingStrategy";

export class DomainBlockingStrategy implements IBlockingStrategy {
  constructor(private readonly watchlistRepo: IWatchlistReadRepository) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const domain = `@${email.split("@")[1]}`;
    const entry = await this.watchlistRepo.findBlockedDomain(domain, organizationId);

    return {
      isBlocked: !!entry,
      reason: entry ? "domain" : undefined,
      watchlistEntry: entry,
    };
  }
}
