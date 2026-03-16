import type { Prisma } from "@calcom/prisma/client";
import type { PrismaClient } from "@calcom/prisma";

import type {
  AbuseScoringConfigDto,
  AbuseRuleGroupDto,
  UserForMonitoringDto,
  UserForScoringDto,
} from "../dto/scoring.dto";
import {
  abuseScoringConfigDtoSchema,
  abuseRuleGroupDtoSchema,
  userForMonitoringDtoSchema,
  userForScoringDtoSchema,
} from "../dto/scoring.dto";
import { ABUSE_MONITORING_WINDOW_DAYS, SCORING_BOOKINGS_LIMIT } from "../lib/constants";

/**
 * Explicitly forbids selecting `abuseData` — this column is pending removal
 * in the contract migration. If any query adds it back, this type will
 * produce a compile error.
 */
type UserAbuseScoreSelectWithoutAbuseData = Prisma.UserAbuseScoreSelect & {
  abuseData?: false;
};

const DEFAULT_CONFIG: AbuseScoringConfigDto = {
  alertThreshold: 50,
  lockThreshold: 80,
  monitoringWindowDays: ABUSE_MONITORING_WINDOW_DAYS,
};

export class AbuseScoringRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findForScoring(userId: number, bookingCutoff: Date): Promise<UserForScoringDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        locked: true,
        userAbuseScore: {
          select: {
            score: true,
          } satisfies UserAbuseScoreSelectWithoutAbuseData,
        },
        eventTypes: {
          select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            successRedirectUrl: true,
            forwardParamsSuccessRedirect: true,
          },
        },
        bookings: {
          where: { createdAt: { gte: bookingCutoff } },
          orderBy: { createdAt: "desc" },
          take: SCORING_BOOKINGS_LIMIT,
          select: {
            createdAt: true,
            cancellationReason: true,
            location: true,
            responses: true,
            eventType: { select: { userId: true } },
            attendees: { select: { email: true } },
          },
        },
      },
    });

    if (!user) return null;

    const flat = {
      ...user,
      abuseScore: user.userAbuseScore?.score ?? 0,
    };

    return userForScoringDtoSchema.parse(flat);
  }

  async findForMonitoring(userId: number): Promise<UserForMonitoringDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdDate: true,
        locked: true,
      },
    });

    if (!user) return null;

    return userForMonitoringDtoSchema.parse(user);
  }

  async findEnabledRules(): Promise<AbuseRuleGroupDto[]> {
    const rules = await this.prisma.abuseRuleGroup.findMany({
      where: { enabled: true },
      select: {
        id: true,
        matchAll: true,
        weight: true,
        autoLock: true,
        description: true,
        conditions: {
          select: {
            id: true,
            field: true,
            operator: true,
            value: true,
          },
        },
      },
    });

    return rules.map((r) => abuseRuleGroupDtoSchema.parse(r));
  }

  async findConfig(): Promise<AbuseScoringConfigDto> {
    const config = await this.prisma.abuseScoringConfig.findUnique({
      where: { id: 1 },
      select: {
        alertThreshold: true,
        lockThreshold: true,
        monitoringWindowDays: true,
      },
    });

    if (!config) return DEFAULT_CONFIG;
    return abuseScoringConfigDtoSchema.parse(config);
  }

  async countRecentBookings(userId: number, since: Date): Promise<number> {
    return this.prisma.booking.count({
      where: { userId, createdAt: { gte: since } },
    });
  }

  async updateAnalysis(
    userId: number,
    data: {
      score: number;
      signals: Array<{ type: string; weight: number; context: string }>;
      lastAnalyzedAt: Date;
      locked?: boolean;
      lockedAt?: Date;
      lockedReason?: string;
    }
  ): Promise<void> {
    const upsertData = {
      score: data.score,
      lastAnalyzedAt: data.lastAnalyzedAt,
      ...(data.lockedAt && { lockedAt: data.lockedAt }),
      ...(data.lockedReason && { lockedReason: data.lockedReason }),
    };

    await this.prisma.$transaction(async (tx) => {
      const abuseScore = await tx.userAbuseScore.upsert({
        where: { userId },
        create: { userId, ...upsertData },
        update: upsertData,
        select: { id: true } satisfies UserAbuseScoreSelectWithoutAbuseData,
      });

      await tx.userAbuseSignal.deleteMany({
        where: { abuseScoreId: abuseScore.id },
      });

      if (data.signals.length > 0) {
        await tx.userAbuseSignal.createMany({
          data: data.signals.map((s) => ({
            abuseScoreId: abuseScore.id,
            type: s.type,
            weight: s.weight,
            context: s.context,
          })),
        });
      }

      if (data.locked !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { locked: data.locked },
          select: { id: true },
        });
      }
    });
  }
}
