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
    const emailEntry = await this.orgRepo.findBlockedEmail(email, organizationId);
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

  async isEmailReported(email: string, organizationId: number): Promise<OrganizationBlockingResult> {
    // Check for exact email match
    const emailEntry = await this.orgRepo.findReportedEmail(email, organizationId);
    if (emailEntry) {
      return {
        isBlocked: true,
        reason: "EMAIL" as WatchlistType,
        watchlistEntry: emailEntry,
      };
    }

    // Check for domain match
    const domain = email.split("@")[1];
    if (domain) {
      // Note: Using findBlockedDomain for now - may need to implement findReportedDomain
      const domainEntry = await this.orgRepo.findBlockedDomain(`@${domain}`, organizationId);
      if (domainEntry) {
        return {
          isBlocked: true,
          reason: "DOMAIN" as WatchlistType,
          watchlistEntry: domainEntry,
        };
      }
    }

    return { isBlocked: false };
  }

  async areUsersBlocked(
    users: { email: string; username: string | null; locked: boolean }[]
  ): Promise<boolean> {
    const usernamesToCheck = [];
    const emailsToCheck = [];
    const domainsToCheck = [];

    for (const user of users) {
      // If any user is locked, return true immediately
      if (user.locked) return true;

      const emailDomain = user.email.split("@")[1];
      if (user.username) usernamesToCheck.push(user.username);
      emailsToCheck.push(user.email);
      domainsToCheck.push(emailDomain);
    }

    const blockedRecords = await this.orgRepo.searchForAllBlockedRecords({
      usernames: usernamesToCheck,
      emails: emailsToCheck,
      domains: domainsToCheck,
    });

    return blockedRecords.length > 0;
  }

  async getOrganizationStats(organizationId: number): Promise<{
    total: number;
    blocked: number;
    reported: number;
  }> {
    const entries = await this.orgRepo.findMany({ organizationId });
    const blocked = entries.filter((entry) => entry.action === "BLOCK").length;
    const reported = entries.filter((entry) => entry.action === "REPORT").length;
    return {
      total: entries.length,
      blocked,
      reported,
    };
  }
}
