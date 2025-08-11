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

/**
 * Validates that the selectedCalendar.connect.id exists and is a string
 * @param data - The CalendarSubscriptionCreateInput data
 * @returns The validated selectedCalendarId
 * @throws Error if validation fails
 */
function validateSelectedCalendarId(data: Prisma.CalendarSubscriptionCreateInput): string {
  if (!data.selectedCalendar) {
    throw new Error("selectedCalendar is required for CalendarSubscription");
  }

  if (!data.selectedCalendar.connect) {
    throw new Error("selectedCalendar.connect is required for CalendarSubscription");
  }

  if (!data.selectedCalendar.connect.id) {
    throw new Error("selectedCalendar.connect.id is required for CalendarSubscription");
  }

  if (typeof data.selectedCalendar.connect.id !== "string") {
    throw new Error("selectedCalendar.connect.id must be a string");
  }

  return data.selectedCalendar.connect.id;
}

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
        googleChannelId: true,
        googleChannelKind: true,
        googleChannelResourceId: true,
        googleChannelResourceUri: true,
        googleChannelExpiration: true,
        nextSyncToken: true,
        lastFullSync: true,
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
      },
    });
  }

  async findByChannelId(channelId: string) {
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
            credential: {
              select: safeCredentialSelectForCalendarCache,
            },
          },
        },
      },
    });
  }

  async upsert(data: Prisma.CalendarSubscriptionCreateInput) {
    const selectedCalendarId = validateSelectedCalendarId(data);

    return await this.prismaClient.calendarSubscription.upsert({
      where: {
        selectedCalendarId,
      },
      create: data,
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async upsertMany(data: Prisma.CalendarSubscriptionCreateInput[]) {
    // Use a transaction to ensure all upserts are atomic
    return await this.prismaClient.$transaction(
      data.map((item) => {
        const selectedCalendarId = validateSelectedCalendarId(item);
        return this.prismaClient.calendarSubscription.upsert({
          where: {
            selectedCalendarId,
          },
          create: item,
          update: {
            ...item,
            updatedAt: new Date(),
          },
        });
      })
    );
  }

  async updateSyncToken(id: string, nextSyncToken: string) {
    await this.prismaClient.calendarSubscription.update({
      where: { id },
      data: {
        nextSyncToken,
        updatedAt: new Date(),
      },
    });
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
            credential: {
              select: safeCredentialSelectForCalendarCache,
            },
          },
        },
      },
    });
  }

  async setWatchError(id: string, _error: string) {
    await this.prismaClient.calendarSubscription.update({
      where: { id },
      data: {
        syncErrors: { increment: 1 },
        backoffUntil: new Date(Date.now() + Math.pow(2, 3) * 60 * 1000),
        updatedAt: new Date(),
      },
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
