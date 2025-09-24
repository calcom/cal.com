import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { IAuditRepository, CreateBlockedBookingInput } from "../interfaces/IAuditRepository";
import type { BlockedBooking } from "../types";

export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createBlockedBookingEntry(data: CreateBlockedBookingInput): Promise<BlockedBooking> {
    try {
      return await this.prisma.blockedBooking.create({
        data: {
          email: data.email,
          organizationId: data.organizationId,
          blockingReason: data.blockingReason,
          watchlistEntryId: data.watchlistEntryId,
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
      const [total, emailBlocked, domainBlocked] = await Promise.all([
        this.prisma.blockedBooking.count({
          where: { organizationId },
        }),
        this.prisma.blockedBooking.count({
          where: { organizationId, blockingReason: "email" },
        }),
        this.prisma.blockedBooking.count({
          where: { organizationId, blockingReason: "domain" },
        }),
      ]);

      return {
        totalBlocked: total,
        blockedByEmail: emailBlocked,
        blockedByDomain: domainBlocked,
      };
    } catch (err) {
      captureException(err);
      throw new Error(`Failed to get blocking stats: ${err}`);
    }
  }

  async getBlockedBookingsByOrganization(organizationId: number): Promise<BlockedBooking[]> {
    try {
      return await this.prisma.blockedBooking.findMany({
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
