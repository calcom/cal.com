import type { Logger } from "tslog";

import { SeatChangeLogRepository } from "@calcom/features/ee/billing/repository/seatChangeLogs/SeatChangeLogRepository";
import logger from "@calcom/lib/logger";
import type { Prisma } from "@calcom/prisma/client";
import type { SeatChangeType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["SeatChangeTrackingService"] });

export interface SeatChangeLogParams {
  teamId: number;
  userId?: number;
  triggeredBy?: number;
  seatCount?: number;
  metadata?: Prisma.InputJsonValue;
  monthKey?: string;
}

export interface MonthlyChanges {
  additions: number;
  removals: number;
  netChange: number;
}

export class SeatChangeTrackingService {
  private logger: Logger<unknown>;
  private repository: SeatChangeLogRepository;

  constructor(customLogger?: Logger<unknown>, repository?: SeatChangeLogRepository) {
    this.logger = customLogger || log;
    this.repository = repository || new SeatChangeLogRepository();
  }

  async logSeatAddition(params: SeatChangeLogParams): Promise<void> {
    const { teamId, userId, triggeredBy, seatCount = 1, metadata, monthKey: providedMonthKey } = params;
    const monthKey = providedMonthKey || this.calculateMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.repository.getTeamBillingIds(teamId);

    await this.repository.create({
      teamId,
      changeType: "ADDITION" as SeatChangeType,
      seatCount,
      userId,
      triggeredBy,
      monthKey,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
      teamBillingId,
      organizationBillingId,
    });
  }

  async logSeatRemoval(params: SeatChangeLogParams): Promise<void> {
    const { teamId, userId, triggeredBy, seatCount = 1, metadata, monthKey: providedMonthKey } = params;
    const monthKey = providedMonthKey || this.calculateMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.repository.getTeamBillingIds(teamId);

    await this.repository.create({
      teamId,
      changeType: "REMOVAL" as SeatChangeType,
      seatCount,
      userId,
      triggeredBy,
      monthKey,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
      teamBillingId,
      organizationBillingId,
    });
  }

  async getMonthlyChanges(params: { teamId: number; monthKey: string }): Promise<MonthlyChanges> {
    const { teamId, monthKey } = params;

    const { additions, removals } = await this.repository.getMonthlyChanges({ teamId, monthKey });

    const netChange = Math.max(0, additions - removals);

    return {
      additions,
      removals,
      netChange,
    };
  }

  async getUnprocessedChanges(params: { teamId: number; monthKey: string }) {
    const { teamId, monthKey } = params;

    return await this.repository.getUnprocessedChanges({ teamId, monthKey });
  }

  async markAsProcessed(params: { teamId: number; monthKey: string; prorationId: string }): Promise<number> {
    const { teamId, monthKey, prorationId } = params;

    return await this.repository.markAsProcessed({ teamId, monthKey, prorationId });
  }

  private calculateMonthKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
}
