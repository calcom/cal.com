import { formatMonthKey } from "@calcom/features/ee/billing/lib/month-key";
import { HighWaterMarkRepository } from "@calcom/features/ee/billing/repository/highWaterMark/HighWaterMarkRepository";
import { MonthlyProrationTeamRepository } from "@calcom/features/ee/billing/repository/proration/MonthlyProrationTeamRepository";
import { SeatChangeLogRepository } from "@calcom/features/ee/billing/repository/seatChangeLogs/SeatChangeLogRepository";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
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
  // Idempotency key to prevent duplicate seat change logs from race conditions
  // Format: "{source}-{uniqueId}" e.g., "membership-123" or "invite-abc"
  operationId?: string;
}

export interface MonthlyChanges {
  additions: number;
  removals: number;
  netChange: number;
}

export interface SeatChangeTrackingServiceDeps {
  repository?: SeatChangeLogRepository;
  highWaterMarkRepo?: HighWaterMarkRepository;
  teamRepo?: MonthlyProrationTeamRepository;
  featuresRepository?: IFeaturesRepository;
}

export class SeatChangeTrackingService {
  private repository: SeatChangeLogRepository;
  private highWaterMarkRepo: HighWaterMarkRepository;
  private teamRepo: MonthlyProrationTeamRepository;
  private featuresRepository: IFeaturesRepository;

  constructor(
    repositoryOrDeps?: SeatChangeLogRepository | SeatChangeTrackingServiceDeps,
    highWaterMarkRepo?: HighWaterMarkRepository,
    teamRepo?: MonthlyProrationTeamRepository
  ) {
    // Support both old positional args and new deps object for backwards compatibility
    if (
      repositoryOrDeps &&
      typeof repositoryOrDeps === "object" &&
      "featuresRepository" in repositoryOrDeps
    ) {
      const deps = repositoryOrDeps as SeatChangeTrackingServiceDeps;
      this.repository = deps.repository || new SeatChangeLogRepository();
      this.highWaterMarkRepo = deps.highWaterMarkRepo || new HighWaterMarkRepository();
      this.teamRepo = deps.teamRepo || new MonthlyProrationTeamRepository();
      this.featuresRepository = deps.featuresRepository || new FeaturesRepository(prisma);
    } else {
      // Legacy constructor signature
      this.repository = (repositoryOrDeps as SeatChangeLogRepository) || new SeatChangeLogRepository();
      this.highWaterMarkRepo = highWaterMarkRepo || new HighWaterMarkRepository();
      this.teamRepo = teamRepo || new MonthlyProrationTeamRepository();
      this.featuresRepository = new FeaturesRepository(prisma);
    }
  }

  async logSeatAddition(params: SeatChangeLogParams): Promise<void> {
    const {
      teamId,
      userId,
      triggeredBy,
      seatCount = 1,
      metadata,
      monthKey: providedMonthKey,
      operationId,
    } = params;
    const monthKey = providedMonthKey || formatMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.repository.getTeamBillingIds(teamId);

    await this.repository.create({
      teamId,
      changeType: "ADDITION" as SeatChangeType,
      seatCount,
      userId,
      triggeredBy,
      monthKey,
      operationId,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
      teamBillingId,
      organizationBillingId,
    });

    // Update high water mark for monthly billing
    await this.updateHighWaterMarkIfNeeded(teamId);
  }

  private async updateHighWaterMarkIfNeeded(teamId: number): Promise<void> {
    try {
      // Check if the feature is enabled
      const isFeatureEnabled = await this.featuresRepository.checkIfFeatureIsEnabledGlobally("hwm-seating");

      if (!isFeatureEnabled) {
        return;
      }

      // Get billing info
      const billing = await this.highWaterMarkRepo.getByTeamId(teamId);
      if (!billing) {
        return;
      }

      // Only update for monthly billing
      if (billing.billingPeriod !== "MONTHLY") {
        return;
      }

      // Get current member count
      const memberCount = await this.teamRepo.getTeamMemberCount(teamId);
      if (memberCount === null) {
        log.warn(`Could not get member count for team ${teamId}`);
        return;
      }

      // Use the billing period start as the HWM period start
      // Prefer subscription start date over arbitrary new Date()
      const periodStart = billing.highWaterMarkPeriodStart || billing.subscriptionStart;
      if (!periodStart) {
        log.warn(`Could not determine period start for team ${teamId} - no subscriptionStart available`);
        return;
      }

      const result = await this.highWaterMarkRepo.updateIfHigher({
        teamId,
        isOrganization: billing.isOrganization,
        newSeatCount: memberCount,
        periodStart,
      });

      if (result.updated) {
        log.info(`High water mark updated for team ${teamId}`, {
          previousHighWaterMark: result.previousHighWaterMark,
          newHighWaterMark: memberCount,
        });
      }
    } catch (error) {
      // Log but don't fail the main operation
      log.error(`Failed to update high water mark for team ${teamId}`, { error });
    }
  }

  async logSeatRemoval(params: SeatChangeLogParams): Promise<void> {
    const {
      teamId,
      userId,
      triggeredBy,
      seatCount = 1,
      metadata,
      monthKey: providedMonthKey,
      operationId,
    } = params;
    const monthKey = providedMonthKey || formatMonthKey(new Date());

    const { teamBillingId, organizationBillingId } = await this.repository.getTeamBillingIds(teamId);

    await this.repository.create({
      teamId,
      changeType: "REMOVAL" as SeatChangeType,
      seatCount,
      userId,
      triggeredBy,
      monthKey,
      operationId,
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
}
