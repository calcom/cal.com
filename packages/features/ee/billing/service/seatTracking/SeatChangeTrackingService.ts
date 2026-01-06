import type { Logger } from "tslog";

import logger from "@calcom/lib/logger";
import type { Prisma } from "@calcom/prisma/client";
import { prisma } from "@calcom/prisma";
import type { SeatChangeType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["SeatChangeTrackingService"] });

export interface SeatChangeLogParams {
  teamId: number;
  userId?: number;
  triggeredBy?: number;
  seatCount?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface MonthlyChanges {
  additions: number;
  removals: number;
  netChange: number;
}

export class SeatChangeTrackingService {
  private logger: Logger<unknown>;

  constructor(customLogger?: Logger<unknown>) {
    this.logger = customLogger || log;
  }

  async logSeatAddition(params: SeatChangeLogParams): Promise<void> {
    const { teamId, userId, triggeredBy, seatCount = 1, metadata } = params;
    const monthKey = this.calculateMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.getBillingIds(teamId);

    await prisma.seatChangeLog.create({
      data: {
        teamId,
        changeType: "ADDITION" as SeatChangeType,
        seatCount,
        userId,
        triggeredBy,
        monthKey,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        teamBillingId,
        organizationBillingId,
      },
    });
  }

  async logSeatRemoval(params: SeatChangeLogParams): Promise<void> {
    const { teamId, userId, triggeredBy, seatCount = 1, metadata } = params;
    const monthKey = this.calculateMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.getBillingIds(teamId);

    await prisma.seatChangeLog.create({
      data: {
        teamId,
        changeType: "REMOVAL" as SeatChangeType,
        seatCount,
        userId,
        triggeredBy,
        monthKey,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        teamBillingId,
        organizationBillingId,
      },
    });
  }

  async getMonthlyChanges(params: { teamId: number; monthKey: string }): Promise<MonthlyChanges> {
    const { teamId, monthKey } = params;

    const changes = await prisma.seatChangeLog.groupBy({
      by: ["changeType"],
      where: {
        teamId,
        monthKey,
        processedInProrationId: null,
      },
      _sum: {
        seatCount: true,
      },
    });

    const additions = changes.find((c) => c.changeType === "ADDITION")?._sum.seatCount || 0;
    const removals = changes.find((c) => c.changeType === "REMOVAL")?._sum.seatCount || 0;
    const netChange = Math.max(0, additions - removals);

    return {
      additions,
      removals,
      netChange,
    };
  }

  async getUnprocessedChanges(params: { teamId: number; monthKey: string }) {
    const { teamId, monthKey } = params;

    return await prisma.seatChangeLog.findMany({
      where: {
        teamId,
        monthKey,
        processedInProrationId: null,
      },
      orderBy: {
        changeDate: "asc",
      },
    });
  }

  async markAsProcessed(params: { teamId: number; monthKey: string; prorationId: string }): Promise<number> {
    const { teamId, monthKey, prorationId } = params;

    const result = await prisma.seatChangeLog.updateMany({
      where: {
        teamId,
        monthKey,
        processedInProrationId: null,
      },
      data: {
        processedInProrationId: prorationId,
      },
    });

    return result.count;
  }

  private calculateMonthKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  private async getBillingIds(
    teamId: number
  ): Promise<{ teamBillingId: string | null; organizationBillingId: string | null }> {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        isOrganization: true,
        teamBilling: {
          select: { id: true },
        },
        organizationBilling: {
          select: { id: true },
        },
      },
    });

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    return {
      teamBillingId: team.teamBilling?.id || null,
      organizationBillingId: team.organizationBilling?.id || null,
    };
  }
}
