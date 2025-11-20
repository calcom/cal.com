import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail, normalizeDomain } from "../utils/normalization";

type Deps = {
  orgRepo: IOrganizationWatchlistRepository;
};

/**
 * Service for organization-specific blocking operations
 * Handles blocking rules that apply only to a specific organization
 */
export class OrganizationBlockingService implements IBlockingService {
  constructor(private readonly deps: Deps) {}

  async isBlocked(email: string, organizationId: number): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedDomain = extractDomainFromEmail(normalizedEmail);

    const emailPromise = this.deps.orgRepo.findBlockedEmail({ email: normalizedEmail, organizationId });
    const domainPromise = this.deps.orgRepo.findBlockedDomain(normalizedDomain, organizationId);

    const [emailEntry, domainEntry] = await Promise.all([emailPromise, domainPromise]);

    if (emailEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: emailEntry,
      };
    }

    if (domainEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: domainEntry,
      };
    }

    return { isBlocked: false };
  }

  async isDomainBlocked(domain: string, organizationId: number): Promise<BlockingResult> {
    const normalizedDomain = normalizeDomain(domain);

    return this.deps.orgRepo.findBlockedDomain(normalizedDomain, organizationId).then((domainEntry) => {
      if (domainEntry) {
        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: domainEntry,
        };
      }
      return { isBlocked: false };
    });
  }
}
