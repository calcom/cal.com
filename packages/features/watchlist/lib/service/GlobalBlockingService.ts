import type { BulkBlockingResult, BlockingResult, IBlockingService } from "../interface/IBlockingService";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import {
  domainMatchesWatchlistEntry,
  extractDomainFromEmail,
  getWildcardPatternsForDomain,
  normalizeDomain,
  normalizeEmail,
} from "../utils/normalization";

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
    const wildcardPatterns = getWildcardPatternsForDomain(normalizedDomain);

    // Query for exact domain match AND wildcard patterns
    const blockingEntries = await this.deps.globalRepo.findBlockingEntriesForEmailsAndDomains({
      emails: [normalizedEmail],
      domains: [normalizedDomain, ...wildcardPatterns],
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

    // Check domain entries - exact match first, then wildcards (most specific to least)
    for (const entry of blockingEntries) {
      if (entry.type === WatchlistType.DOMAIN && domainMatchesWatchlistEntry(normalizedDomain, entry.value)) {
        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: entry,
        };
      }
    }

    return { isBlocked: false };
  }

  /**
   * Bulk check multiple emails in a single query.
   * Returns Map<email (lowercase), BlockingResult> for efficient lookup.
   * Supports configurable wildcard domain matching:
   * - `*.cal.com` blocks all subdomains (app.cal.com, sub.app.cal.com, etc.)
   * - `cal.com` only blocks exact matches
   */
  async areBlocked(emails: string[]): Promise<BulkBlockingResult> {
    const result: BulkBlockingResult = new Map();

    if (emails.length === 0) {
      return result;
    }

    // Normalize and extract domains with wildcard patterns
    const normalizedEmails = emails.map((e) => normalizeEmail(e));
    const emailToDomain = new Map<string, string>();

    // Collect all unique domains and wildcard patterns for the query
    const allDomainsAndPatterns = new Set<string>();

    for (const email of normalizedEmails) {
      const domain = extractDomainFromEmail(email);
      emailToDomain.set(email, domain);
      allDomainsAndPatterns.add(domain);

      // Add wildcard patterns that could match this domain
      const wildcardPatterns = getWildcardPatternsForDomain(domain);
      for (const pattern of wildcardPatterns) {
        allDomainsAndPatterns.add(pattern);
      }
    }

    // Single DB query for all emails and domains/patterns
    const blockingEntries = await this.deps.globalRepo.findBlockingEntriesForEmailsAndDomains({
      emails: normalizedEmails,
      domains: Array.from(allDomainsAndPatterns),
    });

    // Build lookup maps for O(1) checks
    const emailEntries = new Map<string, (typeof blockingEntries)[0]>();
    const domainEntries: Array<(typeof blockingEntries)[0]> = [];

    for (const entry of blockingEntries) {
      if (entry.type === WatchlistType.EMAIL) {
        emailEntries.set(entry.value.toLowerCase(), entry);
      } else if (entry.type === WatchlistType.DOMAIN) {
        domainEntries.push(entry);
      }
    }

    // Map results for each email
    for (const email of normalizedEmails) {
      const domain = emailToDomain.get(email) || "";
      const emailEntry = emailEntries.get(email);

      if (emailEntry) {
        result.set(email, {
          isBlocked: true,
          reason: WatchlistType.EMAIL,
          watchlistEntry: emailEntry,
        });
        continue;
      }

      // Check domain entries using the matching function
      let blocked = false;
      for (const entry of domainEntries) {
        if (domainMatchesWatchlistEntry(domain, entry.value)) {
          result.set(email, {
            isBlocked: true,
            reason: WatchlistType.DOMAIN,
            watchlistEntry: entry,
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

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const normalizedDomain = normalizeDomain(domain);
    return this.deps.globalRepo.findFreeEmailDomain(normalizedDomain).then((entry) => !!entry);
  }
}
