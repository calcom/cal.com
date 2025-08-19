import type { Prisma } from "@prisma/client";

import type { PrismaClient } from "@calcom/prisma";

import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

const CALENDAR_CACHE_SQL_WRITE_FEATURE = "calendar-cache-sql-write";

// Safe credential select that excludes sensitive fields
const safeCredentialSelectForCalendarCache = {
  id: true,
  type: true,
  userId: true,
  teamId: true,
  appId: true,
  invalid: true,
  // Explicitly excluding sensitive fields: key, subscriptionId, paymentStatus, billingCycleStart, delegationCredentialId
} satisfies Prisma.CredentialSelect;

// Input validation belongs in services/domain layer; repository methods accept explicit IDs

export class CalendarSubscriptionRepository implements ICalendarSubscriptionRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findBySelectedCalendar(selectedCalendarId: string) {
    return await this.prismaClient.calendarSubscription.findUnique({
      where: {
        selectedCalendarId,
      },
      select: {
        id: true,
        selectedCalendarId: true,
        channelId: true,
        channelKind: true,
        channelResourceId: true,
        channelResourceUri: true,
        channelResource: true,
        clientState: true,
        channelExpiration: true,
        syncCursor: true,
        syncErrors: true,
        maxSyncErrors: true,
        backoffUntil: true,
        createdAt: true,
        updatedAt: true,
        selectedCalendar: {
          select: {
            id: true,
            externalId: true,
            integration: true,
            userId: true,
            credential: {
              select: safeCredentialSelectForCalendarCache,
            },
          },
        },
      },
    });
  }

  async findByCredentialId(credentialId: number) {
    return await this.prismaClient.calendarSubscription.findFirst({
      where: {
        selectedCalendar: {
          credentialId,
        },
      },
    });
  }

  async findBySelectedCalendarIds(selectedCalendarIds: string[]) {
    return await this.prismaClient.calendarSubscription.findMany({
      where: {
        selectedCalendarId: {
          in: selectedCalendarIds,
        },
      },
      select: {
        id: true,
        selectedCalendarId: true,
        updatedAt: true,
      },
    });
  }

  async findByChannelId(channelId: string) {
    return await this.prismaClient.calendarSubscription.findFirst({
      where: {
        channelId,
      },
      include: {
        selectedCalendar: {
          select: {
            id: true,
            externalId: true,
            integration: true,
            userId: true,
            credential: {
              select: safeCredentialSelectForCalendarCache,
            },
          },
        },
      },
    });
  }

  async upsertBySelectedCalendarId(selectedCalendarId: string) {
    return await this.prismaClient.calendarSubscription.upsert({
      where: {
        selectedCalendarId,
      },
      create: {
        selectedCalendar: { connect: { id: selectedCalendarId } },
      },
      update: {
        updatedAt: new Date(),
      },
    });
  }

  async upsertManyBySelectedCalendarId(selectedCalendarIds: string[]) {
    // Use transactional callback for better compatibility with Prismock tests
    return await this.prismaClient.$transaction(async (tx) => {
      const results = await Promise.all(
        selectedCalendarIds.map((selectedCalendarId) =>
          tx.calendarSubscription.upsert({
            where: { selectedCalendarId },
            create: { selectedCalendar: { connect: { id: selectedCalendarId } } },
            update: { updatedAt: new Date() },
          })
        )
      );
      return results;
    });
  }

  async updateSyncToken(id: string, nextSyncToken: string) {
    await this.prismaClient.calendarSubscription.update({
      where: { id },
      data: {
        syncCursor: nextSyncToken,
        updatedAt: new Date(),
      },
    });
  }

  async updateWatchDetails(
    id: string,
    details: {
      channelId: string;
      channelKind?: string;
      channelResourceId?: string;
      channelResourceUri?: string;
      channelExpiration: string;
    }
  ) {
    await this.prismaClient.calendarSubscription.update({
      where: { id },
      data: {
        ...details,
        updatedAt: new Date(),
      },
    });
  }

  async getSubscriptionsToWatch(limit = 100) {
    const oneDayInMS = 24 * 60 * 60 * 1000;
    const tomorrowTimestamp = String(new Date().getTime() + oneDayInMS);

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
                      featureId: CALENDAR_CACHE_SQL_WRITE_FEATURE,
                    },
                  },
                },
              },
            },
          },
          integration: "google_calendar",
        },
        syncErrors: {
          lt: this.prismaClient.calendarSubscription.fields.maxSyncErrors,
        },
        OR: [{ channelExpiration: null }, { channelExpiration: { lt: tomorrowTimestamp } }],
        AND: [{ OR: [{ backoffUntil: null }, { backoffUntil: { lte: new Date() } }] }],
      },
      include: {
        selectedCalendar: {
          select: {
            id: true,
            externalId: true,
            integration: true,
            userId: true,
            credential: {
              select: safeCredentialSelectForCalendarCache,
            },
          },
        },
      },
    });
  }

  async setWatchError(id: string, _error: string) {
    await this.prismaClient.$transaction(async (tx) => {
      const current = await tx.calendarSubscription.findUnique({
        where: { id },
        select: { syncErrors: true, maxSyncErrors: true },
      });

      const currentSyncErrors = current?.syncErrors ?? 0;
      const maxSyncErrors = current?.maxSyncErrors ?? 5;
      const newSyncErrors = Math.min(currentSyncErrors + 1, maxSyncErrors);

      // Exponential backoff in minutes capped to 60 minutes
      const backoffMinutes = Math.min(Math.pow(2, newSyncErrors), 60);
      const backoffUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await tx.calendarSubscription.update({
        where: { id },
        data: {
          syncErrors: newSyncErrors,
          backoffUntil,
          updatedAt: new Date(),
        },
      });
    });
  }

  async clearWatchError(id: string) {
    await this.prismaClient.calendarSubscription.update({
      where: { id },
      data: {
        syncErrors: 0,
        backoffUntil: null,
        updatedAt: new Date(),
      },
    });
  }
}
