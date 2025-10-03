import type { IAuditService } from "../interface/IAuditService";
import type {
  IBlockingService,
  BlockingResult,
  DecoyBookingResponse,
  BookingData,
} from "../interface/IBlockingService";
import type { IWatchlistReadRepository } from "../interface/IWatchlistRepositories";
import { WatchlistType } from "../types";

export class BlockingService implements IBlockingService {
  constructor(
    private readonly watchlistRepository: IWatchlistReadRepository,
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Check for exact email match first
    const emailEntry = await this.watchlistRepository.findBlockedEntry(email, organizationId);
    if (emailEntry) {
      // Log the blocking attempt
      await this.auditService.logBlockedBookingAttempt({
        email,
        organizationId,
        watchlistId: emailEntry.id,
      });

      return {
        isBlocked: true,
        reason: WatchlistType.EMAIL,
        watchlistEntry: emailEntry,
      };
    }

    // Check for domain match
    const domain = email.split("@")[1];
    if (domain) {
      const domainEntry = await this.watchlistRepository.findBlockedDomain(`@${domain}`, organizationId);
      if (domainEntry) {
        // Log the blocking attempt
        await this.auditService.logBlockedBookingAttempt({
          email,
          organizationId,
          watchlistId: domainEntry.id,
        });

        return {
          isBlocked: true,
          reason: WatchlistType.DOMAIN,
          watchlistEntry: domainEntry,
        };
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
