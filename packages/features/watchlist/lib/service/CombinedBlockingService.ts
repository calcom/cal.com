import type { IAuditService } from "../interface/IAuditService";
import type { IBlockingService, BlockingResult } from "../interface/IBlockingService";
import type { IGlobalWatchlistRepository, IOrganizationWatchlistRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";
import { normalizeEmail, extractDomainFromEmail } from "../utils/normalization";

/**
 * Combined Blocking Service - checks both global and organization-level blocking
 * 
 * Priority order:
 * 1. Global blocking (applies to all organizations)
 * 2. Organization-level blocking (if organizationId is provided)
 * 
 * Returns blocked if either global or organization-level blocking matches.
 */
export class CombinedBlockingService implements IBlockingService {
  constructor(
    private readonly globalRepo: IGlobalWatchlistRepository,
    private readonly orgRepo: IOrganizationWatchlistRepository,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    const normalizedEmail = normalizeEmail(email);

    // Check global blocking first (applies to everyone)
    const globalResult = await this.checkGlobalBlocking(normalizedEmail, organizationId);
    if (globalResult.isBlocked) {
      return globalResult;
    }

    // Check organization-level blocking if organizationId is provided
    if (organizationId !== undefined && organizationId !== null) {
      const orgResult = await this.checkOrganizationBlocking(normalizedEmail, organizationId);
      if (orgResult.isBlocked) {
        return orgResult;
      }
    }

    return { isBlocked: false };
  }

  private async checkGlobalBlocking(normalizedEmail: string, organizationId?: number): Promise<BlockingResult> {
    // Check global email blocking
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

    // Check global domain blocking
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

  private async checkOrganizationBlocking(normalizedEmail: string, organizationId: number): Promise<BlockingResult> {
    // Check organization-level email blocking
    const orgEmailEntry = await this.orgRepo.findBlockedEmail(normalizedEmail, organizationId);
    if (orgEmailEntry) {
      await this.auditService.logBlockedBookingAttempt({
        email: normalizedEmail,
        organizationId,
        watchlistId: orgEmailEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: orgEmailEntry,
      };
    }

    // Check organization-level domain blocking
    const normalizedDomain = extractDomainFromEmail(normalizedEmail);
    const orgDomainEntry = await this.orgRepo.findBlockedDomain(normalizedDomain, organizationId);
    if (orgDomainEntry) {
      await this.auditService.logBlockedBookingAttempt({
        email: normalizedEmail,
        organizationId,
        watchlistId: orgDomainEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.DOMAIN,
        watchlistEntry: orgDomainEntry,
      };
    }

    return { isBlocked: false };
  }
}
