import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import type { Watchlist, WatchlistType } from "../types";

export interface OrganizationBlockingResult {
  isBlocked: boolean;
  reason?: WatchlistType;
  watchlistEntry?: Watchlist | null;
}

/**
 * Service for organization-specific blocking operations
 * Handles blocking rules that apply only to a specific organization
 */
export class OrganizationBlockingService {
  constructor(private readonly orgRepo: IOrganizationWatchlistRepository) {}

  async isEmailBlocked(email: string, organizationId: number): Promise<OrganizationBlockingResult> {
    const domain = email.split("@")[1];

    // Prepare repository calls
    const emailPromise = this.orgRepo.findBlockedEmail({ email, organizationId });
    const domainPromise = domain
      ? this.orgRepo.findBlockedDomain(`@${domain}`, organizationId)
      : Promise.resolve(null);

    // Execute both calls in parallel
    const [emailEntry, domainEntry] = await Promise.all([emailPromise, domainPromise]);

    // Check results in priority order (email first, then domain)
    if (emailEntry) {
      // TODO: Add audit logging when audit service is injected
      return {
        isBlocked: true,
        reason: "EMAIL" as WatchlistType,
        watchlistEntry: emailEntry,
      };
    }

    if (domainEntry) {
      // TODO: Add audit logging when audit service is injected
      return {
        isBlocked: true,
        reason: "DOMAIN" as WatchlistType,
        watchlistEntry: domainEntry,
      };
    }

    return { isBlocked: false };
  }

  async isDomainBlocked(domain: string, organizationId: number): Promise<OrganizationBlockingResult> {
    const normalizedDomain = domain.startsWith("@") ? domain : `@${domain}`;

    return this.orgRepo.findBlockedDomain(normalizedDomain, organizationId).then((domainEntry) => {
      if (domainEntry) {
        return {
          isBlocked: true,
          reason: "DOMAIN" as WatchlistType,
          watchlistEntry: domainEntry,
        };
      }
      return { isBlocked: false };
    });
  }
}
