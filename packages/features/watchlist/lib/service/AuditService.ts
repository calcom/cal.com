import type { IAuditRepository } from "../interface/IAuditRepository";
import type { IAuditService } from "../interface/IAuditService";

export class AuditService implements IAuditService {
  constructor(private readonly auditRepository: IAuditRepository) {}

  async logBlockedBookingAttempt(data: {
    email: string;
    organizationId?: number;
    watchlistId: string;
    eventTypeId?: number;
    bookingData?: Record<string, unknown>;
  }): Promise<void> {
    if (!data.eventTypeId) {
      console.warn("Cannot log blocked booking attempt without eventTypeId");
      return;
    }

    try {
      await this.auditRepository.createEventAudit({
        watchlistId: data.watchlistId,
        eventTypeId: data.eventTypeId,
        actionTaken: "BLOCK",
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

  async logWatchlistChange(data: {
    watchlistId: string;
    type: string;
    value: string;
    description?: string;
    action: string;
    changedByUserId?: number;
  }): Promise<void> {
    try {
      await this.auditRepository.createChangeAudit({
        type: data.type,
        value: data.value,
        description: data.description,
        action: data.action,
        changedByUserId: data.changedByUserId,
        watchlistId: data.watchlistId,
      });
    } catch (err) {
      console.error("Failed to log watchlist change:", err);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }
}
