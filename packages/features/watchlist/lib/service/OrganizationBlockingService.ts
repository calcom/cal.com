import type { BulkBlockingResult, BlockingResult, IBlockingService } from "../interface/IBlockingService";
import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import {
  extractDomainFromEmail,
  getParentDomains,
  normalizeDomain,
  normalizeEmail,
} from "../utils/normalization";

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
    const parentDomains = getParentDomains(normalizedDomain);

    const blockingEntries = await this.deps.orgRepo.findBlockingEntriesForEmailsAndDomains({
      emails: [normalizedEmail],
      domains: parentDomains,
      organizationId,
    });

    const emailEntry = blockingEntries.find(
      (entry) => entry.type === WatchlistType.EMAIL && entry.value.toLowerCase() === normalizedEmail
    );

    if (emailEntry) {
      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: emailEntry,
      };
    }

    for (const domain of parentDomains) {
      const domainEntry = blockingEntries.find(
        (entry) => entry.type === WatchlistType.DOMAIN && entry.value.toLowerCase() === domain
      );
      if (domainEntry) {
        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: domainEntry,
        };
      }
    }

    return { isBlocked: false };
  }

  /**
   * Bulk check multiple emails in a single query for an organization.
   * Returns Map<email (lowercase), BlockingResult> for efficient lookup.
   * Supports wildcard domain matching - blocking cal.com also blocks app.cal.com.
   */
  async areBlocked(emails: string[], organizationId: number): Promise<BulkBlockingResult> {
    const result: BulkBlockingResult = new Map();

    if (emails.length === 0 || !organizationId) {
      return result;
    }

    // Normalize and extract domains with parent domains for wildcard matching
    const normalizedEmails = emails.map((e) => normalizeEmail(e));
    const emailToParentDomains = new Map<string, string[]>();

    for (const email of normalizedEmails) {
      const domain = extractDomainFromEmail(email);
      const parentDomains = getParentDomains(domain);
      emailToParentDomains.set(email, parentDomains);
    }

    // Collect all unique domains (including parent domains) for the query
    const allDomains = new Set<string>();
    for (const parentDomains of Array.from(emailToParentDomains.values())) {
      for (const domain of parentDomains) {
        allDomains.add(domain);
      }
    }

    // Single DB query for all emails and domains
    const blockingEntries = await this.deps.orgRepo.findBlockingEntriesForEmailsAndDomains({
      emails: normalizedEmails,
      domains: Array.from(allDomains),
      organizationId,
    });

    // Build lookup maps for O(1) checks (Maps serve as both lookup and entry storage)
    const emailEntries = new Map<string, (typeof blockingEntries)[0]>();
    const domainEntries = new Map<string, (typeof blockingEntries)[0]>();

    for (const entry of blockingEntries) {
      if (entry.type === WatchlistType.EMAIL) {
        emailEntries.set(entry.value.toLowerCase(), entry);
      } else if (entry.type === WatchlistType.DOMAIN) {
        domainEntries.set(entry.value.toLowerCase(), entry);
      }
    }

    // Map results for each email
    for (const email of normalizedEmails) {
      const parentDomains = emailToParentDomains.get(email) || [];
      const emailEntry = emailEntries.get(email);

      if (emailEntry) {
        result.set(email, {
          isBlocked: true,
          reason: WatchlistType.EMAIL,
          watchlistEntry: emailEntry,
        });
        continue;
      }

      // Check parent domains from most specific to least specific
      let blocked = false;
      for (const domain of parentDomains) {
        const domainEntry = domainEntries.get(domain);
        if (domainEntry) {
          result.set(email, {
            isBlocked: true,
            reason: WatchlistType.DOMAIN,
            watchlistEntry: domainEntry,
          });
          blocked = true;
          break;
        }
      }

      if (!blocked) {
        result.set(email, { isBlocked: false });
      }
    }

    return result;
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
