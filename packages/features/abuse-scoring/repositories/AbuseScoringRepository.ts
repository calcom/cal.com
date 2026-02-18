import type { PrismaClient, WatchlistType } from "@calcom/prisma";

import type { UserForMonitoringDto, UserForScoringDto, WatchlistPatternDto } from "../dto/scoring.dto";
import {
  userForMonitoringDtoSchema,
  userForScoringDtoSchema,
  watchlistPatternDtoSchema,
} from "../dto/scoring.dto";
import { SCORING_BOOKINGS_LIMIT } from "../lib/constants";
import type { AbuseMetadata } from "../types";

export class AbuseScoringRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findForScoring(userId: number, bookingCutoff: Date): Promise<UserForScoringDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        locked: true,
        userAbuseScore: {
          select: {
            score: true,
            abuseData: true,
          },
        },
        eventTypes: {
          select: {
            id: true,
            userId: true,
            title: true,
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
      abuseData: user.userAbuseScore?.abuseData ?? null,
    };

    return userForScoringDtoSchema.parse(flat);
  }

  async findForMonitoring(userId: number): Promise<UserForMonitoringDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdDate: true,
        locked: true,
        userAbuseScore: {
          select: {
            abuseData: true,
          },
        },
      },
    });

    if (!user) return null;

    const flat = {
      ...user,
      abuseData: user.userAbuseScore?.abuseData ?? null,
    };

    return userForMonitoringDtoSchema.parse(flat);
  }

  async findWatchlistPatterns(types: WatchlistType[]): Promise<WatchlistPatternDto[]> {
    const rows = await this.prisma.watchlist.findMany({
      where: { type: { in: types }, isGlobal: true },
      select: { type: true, value: true },
    });
    return rows.map((r) => watchlistPatternDtoSchema.parse(r));
  }

  async countRecentBookings(userId: number, since: Date): Promise<number> {
    return this.prisma.booking.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  }

  async updateAbuseData(
    userId: number,
    data: {
      score: number;
      abuseData: AbuseMetadata;
      lastAnalyzedAt: Date;
      locked?: boolean;
      lockedAt?: Date;
      lockedReason?: string;
    }
  ): Promise<void> {
    await this.prisma.userAbuseScore.upsert({
      where: { userId },
      create: {
        userId,
        score: data.score,
        abuseData: data.abuseData,
        lastAnalyzedAt: data.lastAnalyzedAt,
        ...(data.lockedAt && { lockedAt: data.lockedAt }),
        ...(data.lockedReason && { lockedReason: data.lockedReason }),
      },
      update: {
        score: data.score,
        abuseData: data.abuseData,
        lastAnalyzedAt: data.lastAnalyzedAt,
        ...(data.lockedAt && { lockedAt: data.lockedAt }),
        ...(data.lockedReason && { lockedReason: data.lockedReason }),
      },
      select: { id: true },
    });

    if (data.locked !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { locked: data.locked },
        select: { id: true },
      });
    }
  }
}
