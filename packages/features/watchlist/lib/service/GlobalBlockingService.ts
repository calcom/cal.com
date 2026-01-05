import type { BulkBlockingResult, BlockingResult, IBlockingService } from "../interface/IBlockingService";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { extractDomainFromEmail, normalizeDomain, normalizeEmail } from "../utils/normalization";

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

    const [globalEmailEntry, globalDomainEntry] = await Promise.all([
      this.deps.globalRepo.findBlockedEmail(normalizedEmail),
      this.deps.globalRepo.findBlockedDomain(normalizedDomain),
    ]);

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

    return { isBlocked: false };
  }

  /**
   * Bulk check multiple emails in a single query.
   * Returns Map<email (lowercase), BlockingResult> for efficient lookup.
   */
  async areBlocked(emails: string[]): Promise<BulkBlockingResult> {
    const result: BulkBlockingResult = new Map();

    if (emails.length === 0) {
      return result;
    }

    // Normalize and extract domains
    const normalizedEmails = emails.map((e) => normalizeEmail(e));
    const uniqueDomains = Array.from(new Set(normalizedEmails.map((e) => extractDomainFromEmail(e))));

    // Single DB query for all emails and domains
    const blockingEntries = await this.deps.globalRepo.findBlockingEntriesForEmailsAndDomains({
      emails: normalizedEmails,
      domains: uniqueDomains,
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
      const domain = extractDomainFromEmail(email);
      const emailEntry = emailEntries.get(email);
      const domainEntry = domainEntries.get(domain);

      if (emailEntry) {
        result.set(email, {
          isBlocked: true,
          reason: WatchlistType.EMAIL,
          watchlistEntry: emailEntry,
        });
      } else if (domainEntry) {
        result.set(email, {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: domainEntry,
        });
      } else {
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
