import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { IAuditRepository, CreateBlockedBookingInput } from "../interfaces/IAuditRepository";
import type { BlockedBooking } from "../types";

export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createBlockedBookingEntry(data: CreateBlockedBookingInput): Promise<BlockedBooking> {
    try {
      return await this.prisma.blockedBookingLog.create({
        data: {
          email: data.email,
          organizationId: data.organizationId,
          watchlistId: data.watchlistId,
          eventTypeId: data.eventTypeId,
          bookingData: (data.bookingData as Prisma.InputJsonValue) || {},
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getBlockingStats(organizationId: number): Promise<{
    totalBlocked: number;
    blockedByEmail: number;
    blockedByDomain: number;
  }> {
    try {
      // Get total count
      const total = await this.prisma.blockedBookingLog.count({
        where: { organizationId },
      });

      // Get counts by joining with Watchlist table using raw query
      const emailBlocked = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "BlockedBookingLog" bbl
        JOIN "Watchlist" w ON bbl."watchlistId" = w."id"
        WHERE bbl."organizationId" = ${organizationId}
        AND w."type" = 'EMAIL'
      `;

      const domainBlocked = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "BlockedBookingLog" bbl
        JOIN "Watchlist" w ON bbl."watchlistId" = w."id"
        WHERE bbl."organizationId" = ${organizationId}
        AND w."type" = 'DOMAIN'
      `;

      return {
        totalBlocked: total,
        blockedByEmail: Number(emailBlocked[0]?.count || 0),
        blockedByDomain: Number(domainBlocked[0]?.count || 0),
      };
    } catch (err) {
      captureException(err);
      throw new Error(`Failed to get blocking stats: ${err}`);
    }
  }

  async getBlockedBookingsByOrganization(organizationId: number): Promise<BlockedBooking[]> {
    try {
      return await this.prisma.blockedBookingLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 100, // Limit to recent 100 entries
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
