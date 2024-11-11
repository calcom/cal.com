import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

type SelectedCalendarCreateInput = {
  credentialId: number;
  userId: number;
  externalId: string;
  integration: string;
};

export class SelectedCalendarRepository {
  static async create(data: SelectedCalendarCreateInput) {
    return await prisma.selectedCalendar.create({
      data: {
        ...data,
      },
    });
  }
  static async upsert(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    return await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId: data.userId,
          integration: data.integration,
          externalId: data.externalId,
        },
      },
      create: { ...data },
      update: { ...data },
    });
  }
  /** Retrieve calendars that need to be watched */
  static async getNextBatchToWatch(limit = 100) {
    // Get selected calendars from users that belong to a team that has calendar cache enabled
    const oneDayInMS = 24 * 60 * 60 * 1000;
    const tomorrowTimestamp = String(new Date().getTime() + oneDayInMS);
    const nextBatch = await prisma.selectedCalendar.findMany({
      take: limit,
      where: {
        user: {
          teams: {
            some: {
              team: {
                features: {
                  some: {
                    featureId: "calendar-cache",
                  },
                },
              },
            },
          },
        },
        // RN we only support google calendar subscriptions for now
        integration: "google_calendar",
        AND: [
          {
            OR: [
              // Either is a calendar pending to be watched
              { googleChannelExpiration: null },
              // Or is a calendar that is about to expire
              { googleChannelExpiration: { lt: tomorrowTimestamp } },
            ],
          },
        ],
      },
    });
    return nextBatch;
  }
  /** Retrieve calendars that are being watched but shouldn't be anymore */
  static async getNextBatchToUnwatch(limit = 100) {
    const nextBatch = await prisma.selectedCalendar.findMany({
      take: limit,
      where: {
        user: {
          teams: {
            every: {
              team: {
                features: {
                  none: {
                    featureId: "calendar-cache",
                  },
                },
              },
            },
          },
        },
        // RN we only support google calendar subscriptions for now
        integration: "google_calendar",
        googleChannelExpiration: { not: null },
      },
    });
    return nextBatch;
  }
}
