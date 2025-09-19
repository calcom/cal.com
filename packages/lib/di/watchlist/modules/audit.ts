import { createModule } from "@evyweb/ioctopus";

import { WATCHLIST_DI_TOKENS } from "../tokens";

// TODO: Implement AuditService when BlockedBooking model is added to schema
// For now, create a mock audit service
class MockAuditService {
  async logBlockedBookingAttempt(data: Record<string, unknown>): Promise<void> {
    console.log("Mock audit log:", data);
  }

  async getBlockingStats(organizationId: number): Promise<Record<string, unknown>> {
    return {
      organizationId,
      totalBlockedAttempts: 0,
      blockedByEmail: 0,
      blockedByDomain: 0,
      recentAttempts: [],
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      },
    };
  }
}

export const auditServiceModule = createModule();

auditServiceModule.bind(WATCHLIST_DI_TOKENS.AUDIT_SERVICE).toClass(MockAuditService, []);
