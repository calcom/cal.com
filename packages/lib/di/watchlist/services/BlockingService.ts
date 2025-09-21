import type { IAuditService } from "../interfaces/IAuditService";
import type {
  IBlockingService,
  BlockingResult,
  DecoyBookingResponse,
  BookingData,
} from "../interfaces/IBlockingService";
import type { IBlockingStrategy } from "../strategies/IBlockingStrategy";

export class BlockingService implements IBlockingService {
  constructor(
    private readonly strategies: IBlockingStrategy[],
    private readonly auditService: IAuditService
  ) {}

  async isBlocked(email: string, organizationId?: number): Promise<BlockingResult> {
    // Check all strategies in order
    for (const strategy of this.strategies) {
      const result = await strategy.isBlocked(email, organizationId);

      if (result.isBlocked) {
        // Log the blocking attempt
        await this.auditService.logBlockedBookingAttempt({
          email,
          organizationId,
          reason: result.reason as "email" | "domain",
          watchlistEntryId: (result.watchlistEntry as { id: string }).id,
        });

        return result;
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
