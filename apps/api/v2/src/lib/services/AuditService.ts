import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type {
  IAuditService,
  BlockedBookingAttempt,
  BlockingStats,
} from "@calcom/features/watchlist/interfaces/IAuditService";

@Injectable()
export class AuditService implements IAuditService {
  constructor(private readonly prisma: PrismaWriteService) {}

  async logBlockedBookingAttempt(data: BlockedBookingAttempt): Promise<void> {
    // TODO: Implement when BlockedBooking model is added to schema
    // For now, we can log to console or external service
    console.log("Blocked booking attempt:", data);
  }

  async getBlockingStats(
    organizationId: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<BlockingStats> {
    // TODO: Implement when BlockedBooking model is added to schema
    // For now, return mock data
    return {
      organizationId,
      totalBlockedAttempts: 0,
      blockedByEmail: 0,
      blockedByDomain: 0,
      recentAttempts: [],
      dateRange: dateRange || {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(),
      },
    };
  }
}
