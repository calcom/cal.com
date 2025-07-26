import type { Prisma } from "@prisma/client";
import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";

import type { ICalendarSubscriptionRepository } from "./calendar-subscription.repository.interface";

export class CalendarSubscriptionRepository implements ICalendarSubscriptionRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findBySelectedCalendar(selectedCalendarId: string) {
    try {
      return await this.prismaClient.calendarSubscription.findUnique({
        where: {
          selectedCalendarId,
        },
        include: {
          selectedCalendar: {
            select: {
              id: true,
              externalId: true,
              integration: true,
              userId: true,
              credential: true,
            },
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async findByChannelId(channelId: string) {
    try {
      return await this.prismaClient.calendarSubscription.findFirst({
        where: {
          googleChannelId: channelId,
        },
        include: {
          selectedCalendar: {
            select: {
              id: true,
              externalId: true,
              integration: true,
              userId: true,
              credential: true,
            },
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async upsert(data: Prisma.CalendarSubscriptionCreateInput) {
    try {
      return await this.prismaClient.calendarSubscription.upsert({
        where: {
          selectedCalendarId: data.selectedCalendar.connect?.id as string,
        },
        create: data,
        update: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateSyncToken(id: string, nextSyncToken: string) {
    try {
      await this.prismaClient.calendarSubscription.update({
        where: { id },
        data: {
          nextSyncToken,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async updateWatchDetails(
    id: string,
    details: {
      googleChannelId: string;
      googleChannelKind?: string;
      googleChannelResourceId?: string;
      googleChannelResourceUri?: string;
      googleChannelExpiration: string;
    }
  ) {
    try {
      await this.prismaClient.calendarSubscription.update({
        where: { id },
        data: {
          ...details,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getSubscriptionsToWatch(limit = 100) {
    const oneDayInMS = 24 * 60 * 60 * 1000;
    const tomorrowTimestamp = String(new Date().getTime() + oneDayInMS);

    try {
      return await this.prismaClient.calendarSubscription.findMany({
        take: limit,
        where: {
          selectedCalendar: {
            user: {
              teams: {
                some: {
                  team: {
                    features: {
                      some: {
                        featureId: "calendar-cache-sql-write",
                      },
                    },
                  },
                },
              },
            },
            integration: "google_calendar",
          },
          syncErrors: { lt: 5 },
          OR: [{ googleChannelExpiration: null }, { googleChannelExpiration: { lt: tomorrowTimestamp } }],
        },
        include: {
          selectedCalendar: {
            select: {
              id: true,
              externalId: true,
              integration: true,
              userId: true,
              credential: true,
            },
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async setWatchError(id: string, _error: string) {
    try {
      await this.prismaClient.calendarSubscription.update({
        where: { id },
        data: {
          syncErrors: { increment: 1 },
          backoffUntil: new Date(Date.now() + Math.pow(2, 3) * 60 * 1000),
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async clearWatchError(id: string) {
    try {
      await this.prismaClient.calendarSubscription.update({
        where: { id },
        data: {
          syncErrors: 0,
          backoffUntil: null,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
