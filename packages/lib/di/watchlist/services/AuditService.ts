import type { IAuditRepository } from "../interfaces/IAuditRepository";
import type { IAuditService } from "../interfaces/IAuditService";

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async logBlockedBookingAttempt(data: {
    email: string;
    organizationId?: number;
    reason: "email" | "domain";
    watchlistEntryId: string;
    eventTypeId?: number;
    bookingData?: Record<string, unknown>;
  }): Promise<void> {
    if (!data.organizationId) {
      console.warn("Cannot log blocked booking attempt without organizationId");
      return;
    }

    try {
      await this.auditRepository.createBlockedBookingEntry({
        email: data.email,
        organizationId: data.organizationId,
        blockingReason: data.reason,
        watchlistEntryId: data.watchlistEntryId,
        eventTypeId: data.eventTypeId,
        bookingData: data.bookingData,
      });
    } catch (err) {
      console.error("Failed to log blocked booking attempt:", err);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  async getBlockingStats(organizationId: number): Promise<{
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  }> {
    try {
      return await this.auditRepository.getBlockingStats(organizationId);
    } catch (err) {
      console.error("Failed to get blocking stats:", err);
      return {
        totalBlocked: 0,
        blockedByEmail: 0,
        blockedByDomain: 0,
      };
    }
  }
}
