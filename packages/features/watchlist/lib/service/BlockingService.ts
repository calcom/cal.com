import type { IAuditService } from "../interface/IAuditService";
import type {
  IBlockingService,
  BlockingResult,
  DecoyBookingResponse,
  BookingData,
} from "../interface/IBlockingService";
import type { GlobalWatchlistRepository } from "../repository/GlobalWatchlistRepository";
import type { OrganizationWatchlistRepository } from "../repository/OrganizationWatchlistRepository";
import { WatchlistType } from "../types";

export class BlockingService implements IBlockingService {
  constructor(
    private readonly globalRepo: GlobalWatchlistRepository,
    private readonly orgRepo: OrganizationWatchlistRepository,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Check global entries first (highest priority)
    const globalEmailEntry = await this.globalRepo.findBlockedEmail(email);
    if (globalEmailEntry) {
      await this.auditService.logBlockedBookingAttempt({
        email,
        organizationId,
        watchlistId: globalEmailEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: globalEmailEntry,
      };
    }

    // Check global domain entries
    const domain = email.split("@")[1];
    if (domain) {
      const globalDomainEntry = await this.globalRepo.findBlockedDomain(`@${domain}`);
      if (globalDomainEntry) {
        await this.auditService.logBlockedBookingAttempt({
          email,
          organizationId,
          watchlistId: globalDomainEntry.id,
        });

        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: globalDomainEntry,
        };
      }
    }

    // Check organization-specific entries if organizationId provided
    if (organizationId) {
      const orgEmailEntry = await this.orgRepo.findBlockedEmail(email, organizationId);
      if (orgEmailEntry) {
        await this.auditService.logBlockedBookingAttempt({
          email,
          organizationId,
          watchlistId: orgEmailEntry.id,
        });

        return {
          isBlocked: true,
          reason: WatchlistType.EMAIL,
          watchlistEntry: orgEmailEntry,
        };
      }

      // Check organization domain entries
      if (domain) {
        const orgDomainEntry = await this.orgRepo.findBlockedDomain(`@${domain}`, organizationId);
        if (orgDomainEntry) {
          await this.auditService.logBlockedBookingAttempt({
            email,
            organizationId,
            watchlistId: orgDomainEntry.id,
          });

          return {
            isBlocked: true,
            reason: WatchlistType.DOMAIN,
            watchlistEntry: orgDomainEntry,
          };
        }
      }
    }

    return { isBlocked: false };
  }

  async createDecoyResponse(_bookingData: BookingData): Promise<DecoyBookingResponse> {
    // Generate a fake UID that looks realistic
    const fakeUid = this.generateFakeUid();

    return {
      uid: fakeUid,
      success: true,
      message: "Booking confirmed successfully",
    };
  }

  private generateFakeUid(): string {
    // Generate a realistic-looking booking UID
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
