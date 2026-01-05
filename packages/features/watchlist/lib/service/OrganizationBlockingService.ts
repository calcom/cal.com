import type { BulkBlockingResult, BlockingResult, IBlockingService } from "../interface/IBlockingService";
import type { IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { extractDomainFromEmail, normalizeDomain, normalizeEmail } from "../utils/normalization";

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

  /**
   * Bulk check multiple emails in a single query for an organization.
   * Returns Map<email (lowercase), BlockingResult> for efficient lookup.
   */
  async areBlocked(emails: string[], organizationId: number): Promise<BulkBlockingResult> {
    const result: BulkBlockingResult = new Map();

    if (emails.length === 0 || !organizationId) {
      return result;
    }

    // Normalize and extract domains
    const normalizedEmails = emails.map((e) => normalizeEmail(e));
    const uniqueDomains = Array.from(new Set(normalizedEmails.map((e) => extractDomainFromEmail(e))));

    // Single DB query for all emails and domains
    const blockingEntries = await this.deps.orgRepo.findBlockingEntriesForEmailsAndDomains({
      emails: normalizedEmails,
      domains: uniqueDomains,
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
