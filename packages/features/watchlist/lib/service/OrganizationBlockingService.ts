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
    // Check for exact email match
    const emailEntry = await this.orgRepo.findBlockedEmail({ email, organizationId });
    if (emailEntry) {
      // TODO: Add audit logging when audit service is injected

      return {
        isBlocked: true,
        reason: "EMAIL" as WatchlistType,
        watchlistEntry: emailEntry,
      };
    }

    // Check for domain match
    const domain = email.split("@")[1];
    if (domain) {
      const domainEntry = await this.orgRepo.findBlockedDomain(`@${domain}`, organizationId);
      if (domainEntry) {
        // TODO: Add audit logging when audit service is injected

        return {
          isBlocked: true,
          reason: "DOMAIN" as WatchlistType,
          watchlistEntry: domainEntry,
        };
      }
    }

    return { isBlocked: false };
  }

  async isDomainBlocked(domain: string, organizationId: number): Promise<OrganizationBlockingResult> {
    const normalizedDomain = domain.startsWith("@") ? domain : `@${domain}`;
    const domainEntry = await this.orgRepo.findBlockedDomain(normalizedDomain, organizationId);

    if (domainEntry) {
      return {
        isBlocked: true,
        reason: "DOMAIN" as WatchlistType,
        watchlistEntry: domainEntry,
      };
    }
    return { isBlocked: false };
  }
}
