import type { BlockingResult, BulkBlockingResult, IBlockingService } from "../interface/IBlockingService";
import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import {
  domainMatchesWatchlistEntry,
  extractDomainFromEmail,
  getWildcardPatternsForDomain,
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
    const wildcardPatterns = getWildcardPatternsForDomain(normalizedDomain);

    const blockingEntries = await this.deps.orgRepo.findBlockingEntriesForEmailsAndDomains({
      emails: [normalizedEmail],
      domains: [normalizedDomain, ...wildcardPatterns],
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
   * Bulk check multiple emails in a single query for an organization.
   * Returns Map<email (lowercase), BlockingResult> for efficient lookup.
   * Supports configurable wildcard domain matching:
   * - `*.cal.com` blocks all subdomains
   * - `cal.com` only blocks exact matches
   */
  async areBlocked(emails: string[], organizationId: number): Promise<BulkBlockingResult> {
    const result: BulkBlockingResult = new Map();

    if (emails.length === 0 || !organizationId) {
      return result;
    }

    const normalizedEmails = emails.map((e) => normalizeEmail(e));
    const emailToDomain = new Map<string, string>();
    const allDomainsAndPatterns = new Set<string>();

    for (const email of normalizedEmails) {
      const domain = extractDomainFromEmail(email);
      emailToDomain.set(email, domain);
      allDomainsAndPatterns.add(domain);

      const wildcardPatterns = getWildcardPatternsForDomain(domain);
      for (const pattern of wildcardPatterns) {
        allDomainsAndPatterns.add(pattern);
      }
    }

    const blockingEntries = await this.deps.orgRepo.findBlockingEntriesForEmailsAndDomains({
      emails: normalizedEmails,
      domains: Array.from(allDomainsAndPatterns),
      organizationId,
    });

    const emailEntries = new Map<string, (typeof blockingEntries)[0]>();
    const domainEntries: Array<(typeof blockingEntries)[0]> = [];

    for (const entry of blockingEntries) {
      if (entry.type === WatchlistType.EMAIL) {
        emailEntries.set(entry.value.toLowerCase(), entry);
      } else if (entry.type === WatchlistType.DOMAIN) {
        domainEntries.push(entry);
      }
    }

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
