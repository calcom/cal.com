import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail, normalizeDomain } from "../utils/normalization";

type Deps = {
  globalRepo: IGlobalWatchlistRepository;
  orgRepo: IOrganizationWatchlistRepository;
};

/**
 * Global Blocking Service - handles only global watchlist entries
 * For organization-specific blocking, use OrganizationBlockingService
 */
export class GlobalBlockingService implements IBlockingService {
  constructor(private readonly deps: Deps) {}

  async isBlocked(email: string, organizationId?: number | null): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedDomain = extractDomainFromEmail(normalizedEmail);

    // Prepare all repository calls
    const globalEmailPromise = this.deps.globalRepo.findBlockedEmail(normalizedEmail);
    const globalDomainPromise = this.deps.globalRepo.findBlockedDomain(normalizedDomain);
    const orgDomainPromise = organizationId
      ? this.deps.orgRepo.findBlockedDomain(normalizedDomain, organizationId)
      : Promise.resolve(null);

    // Execute all repository calls in parallel
    const [globalEmailEntry, globalDomainEntry, orgDomainEntry] = await Promise.all([
      globalEmailPromise,
      globalDomainPromise,
      orgDomainPromise,
    ]);

    // Check results in priority order
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

    if (orgDomainEntry) {
      // TODO: Add audit logging when audit service is injected
      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: orgDomainEntry,
      };
    }

    return { isBlocked: false };
  }

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    return this.deps.globalRepo.findFreeEmailDomain(normalizedDomain).then((entry) => !!entry);
  }
}
