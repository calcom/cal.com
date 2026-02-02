import type { PrismaClient } from "@calcom/prisma";
import { prisma as defaultPrisma } from "@calcom/prisma";
import type { Prisma, SeatChangeLog } from "@calcom/prisma/client";
import type { SeatChangeType } from "@calcom/prisma/enums";

export interface CreateSeatChangeLogData {
  teamId: number;
  changeType: SeatChangeType;
  seatCount: number;
  userId?: number;
  triggeredBy?: number;
  monthKey: string;
  operationId?: string;
  metadata?: Prisma.InputJsonValue;
  teamBillingId: string | null;
  organizationBillingId: string | null;
}

export interface MonthlyChangesResult {
  additions: number;
  removals: number;
}

export class SeatChangeLogRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async create(data: CreateSeatChangeLogData): Promise<SeatChangeLog> {
    // If operationId is provided, use upsert to prevent duplicates
    if (data.operationId) {
      return await this.prisma.seatChangeLog.upsert({
        where: {
          teamId_operationId: {
            teamId: data.teamId,
            operationId: data.operationId,
          },
        },
        create: data,
        update: {}, // No update needed - if it exists, we skip
      });
    }

    return await this.prisma.seatChangeLog.create({
      data,
    });
  }

  async getMonthlyChanges(params: { teamId: number; monthKey: string }): Promise<MonthlyChangesResult> {
    const { teamId, monthKey } = params;

    const changes = await this.prisma.seatChangeLog.groupBy({
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

    return {
      additions,
      removals,
    };
  }

  async getUnprocessedChanges(params: { teamId: number; monthKey: string }): Promise<SeatChangeLog[]> {
    const { teamId, monthKey } = params;

    return await this.prisma.seatChangeLog.findMany({
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

    const result = await this.prisma.seatChangeLog.updateMany({
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

  async getTeamBillingIds(
    teamId: number
  ): Promise<{ teamBillingId: string | null; organizationBillingId: string | null }> {
    const team = await this.prisma.team.findUnique({
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
