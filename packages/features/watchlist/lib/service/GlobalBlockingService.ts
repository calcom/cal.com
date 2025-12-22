import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail, normalizeDomain } from "../utils/normalization";

type Deps = {
  globalRepo: IGlobalWatchlistRepository;
};

/**
 * Global Blocking Service - handles only global watchlist entries
 * For organization-specific blocking, use OrganizationBlockingService
 */
export class GlobalBlockingService implements IBlockingService {
  constructor(private readonly deps: Deps) {}

  async isBlocked(email: string): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedDomain = extractDomainFromEmail(normalizedEmail);

    const [globalEmailEntry, globalDomainEntry] = await Promise.all([
      this.deps.globalRepo.findBlockedEmail(normalizedEmail),
      this.deps.globalRepo.findBlockedDomain(normalizedDomain),
    ]);

    if (globalEmailEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: globalEmailEntry,
      };
    }

    if (globalDomainEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: globalDomainEntry,
      };
    }

    return { isBlocked: false };
  }

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    return this.deps.globalRepo.findFreeEmailDomain(normalizedDomain).then((entry) => !!entry);
  }
}
