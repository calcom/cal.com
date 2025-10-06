import type { IAuditService } from "../interface/IAuditService";
import type {
  IBlockingService,
  BlockingResult,
  DecoyBookingResponse,
  BookingData,
} from "../interface/IBlockingService";
import type { GlobalWatchlistRepository } from "../repository/GlobalWatchlistRepository";
import { WatchlistType } from "../types";

/**
 * Global Blocking Service - handles only global watchlist entries
 * For organization-specific blocking, use OrganizationBlockingService
 */
export class GlobalBlockingService implements IBlockingService {
  constructor(
    private readonly globalRepo: GlobalWatchlistRepository,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Check global email entries
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

    return { isBlocked: false };
  }

  async isFreeEmailDomain(domain: string): Promise<boolean> {
    const entry = await this.globalRepo.findFreeEmailDomain(domain);
    return !!entry;
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
