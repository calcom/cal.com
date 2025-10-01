import type { IAuditService } from "../interfaces/IAuditService";
import type { OrganizationWatchlistRepository } from "../repositories/OrganizationWatchlistRepository";
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
  constructor(
    private readonly organizationWatchlistRepository: OrganizationWatchlistRepository,
    private readonly auditService: IAuditService
  ) {}

  async isEmailBlocked(email: string, organizationId: number): Promise<OrganizationBlockingResult> {
    // Check for exact email match
    const emailEntry = await this.organizationWatchlistRepository.findBlockedEmail(email, organizationId);
    if (emailEntry) {
      // Log the blocking attempt
      await this.auditService.logBlockedBookingAttempt({
        email,
        organizationId,
        watchlistId: emailEntry.id,
      });

      return {
        isBlocked: true,
        reason: "EMAIL" as WatchlistType,
        watchlistEntry: emailEntry,
      };
    }

    // Check for domain match
    const domain = email.split("@")[1];
    if (domain) {
      const domainEntry = await this.organizationWatchlistRepository.findBlockedDomain(
        `@${domain}`,
        organizationId
      );
      if (domainEntry) {
        // Log the blocking attempt
        await this.auditService.logBlockedBookingAttempt({
          email,
          organizationId,
          watchlistId: domainEntry.id,
        });

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
    const domainEntry = await this.organizationWatchlistRepository.findBlockedDomain(
      normalizedDomain,
      organizationId
    );

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
    const emailEntry = await this.organizationWatchlistRepository.findReportedEmail(email, organizationId);
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
      const domainEntry = await this.organizationWatchlistRepository.findReportedDomain(
        `@${domain}`,
        organizationId
      );
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
    users: { email: string; username: string | null; locked: boolean }[],
    organizationId: number
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

    const blockedRecords = await this.organizationWatchlistRepository.searchOrganizationBlockedRecords(
      organizationId,
      {
        usernames: usernamesToCheck,
        emails: emailsToCheck,
        domains: domainsToCheck,
      }
    );

    return blockedRecords.length > 0;
  }

  async getOrganizationStats(organizationId: number): Promise<{
    total: number;
    blocked: number;
    reported: number;
  }> {
    return await this.organizationWatchlistRepository.countEntriesByOrganization(organizationId);
  }
}
