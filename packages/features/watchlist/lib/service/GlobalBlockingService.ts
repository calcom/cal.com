import type { IAuditService } from "../interface/IAuditService";
import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type { IGlobalWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail } from "../utils/normalization";

/**
 * Global Blocking Service - handles only global watchlist entries
 * For organization-specific blocking, use OrganizationBlockingService
 */
export class GlobalBlockingService implements IBlockingService {
  constructor(
    private readonly globalRepo: IGlobalWatchlistRepository,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);

    const globalEmailEntry = await this.globalRepo.findBlockedEmail(normalizedEmail);
    if (globalEmailEntry) {
      await this.auditService.logBlockedBookingAttempt({
        email: normalizedEmail,
        organizationId,
        watchlistId: globalEmailEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: globalEmailEntry,
      };
    }

    const normalizedDomain = extractDomainFromEmail(normalizedEmail);
    const globalDomainEntry = await this.globalRepo.findBlockedDomain(normalizedDomain);
    if (globalDomainEntry) {
      await this.auditService.logBlockedBookingAttempt({
        email: normalizedEmail,
        organizationId,
        watchlistId: globalDomainEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: globalDomainEntry,
      };
    }
    return { isBlocked: false };
  }

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const normalizedDomain = domain.startsWith("@") ? domain : `@${domain}`;
    const entry = await this.globalRepo.findFreeEmailDomain(normalizedDomain.toLowerCase());
    return !!entry;
  }
}
