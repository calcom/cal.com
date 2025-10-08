import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type {
  IGlobalWatchlistRepository,
  IOrganizationWatchlistRepository,
} from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail, normalizeDomain } from "../utils/normalization";

/**
 * Global Blocking Service - handles only global watchlist entries
 * For organization-specific blocking, use OrganizationBlockingService
 */
export class GlobalBlockingService implements IBlockingService {
  constructor(
    private readonly globalRepo: IGlobalWatchlistRepository,
    private readonly orgRepo: IOrganizationWatchlistRepository
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);

    const globalEmailEntry = await this.globalRepo.findBlockedEmail(normalizedEmail);
    if (globalEmailEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: globalEmailEntry,
      };
    }

    const normalizedDomain = extractDomainFromEmail(normalizedEmail);
    const globalDomainEntry = await this.globalRepo.findBlockedDomain(normalizedDomain);
    if (globalDomainEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: globalDomainEntry,
      };
    }

    // Add org specific check here
    if (organizationId) {
      const orgDomainEntry = await this.orgRepo.findBlockedDomain(normalizedDomain, organizationId);
      if (orgDomainEntry) {
        // TODO: Add audit logging when audit service is injected

        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: orgDomainEntry,
        };
      }
    }
    return { isBlocked: false };
  }

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    const entry = await this.globalRepo.findFreeEmailDomain(normalizedDomain);
    return !!entry;
  }
}
