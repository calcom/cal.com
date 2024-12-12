import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export class SelectedCalendarRepository {
  static async create(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    return await prisma.selectedCalendar.create({
      data: {
        ...data,
      },
    });
  }

  static async upsert(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    // Because userId_integration_externalId_eventTypeId is a unique constraint but with eventTypeId being nullable.
    // We can't use upsert here
    // We have to ensure at all places(which we do) that an entry doesn't exist already before creating a new one
    const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
      where: {
        userId: data.userId,
        integration: data.integration,
        externalId: data.externalId,
        eventTypeId: data.eventTypeId || null,
      },
    });

    if (existingSelectedCalendar) {
      return await prisma.selectedCalendar.update({
        where: {
          id: existingSelectedCalendar.id,
        },
        data,
      });
    }

    return await prisma.selectedCalendar.create({
      data,
    });
  }

  // static async upsertManyByUserIdIntegrationAndExternalId(data: Prisma.SelectedCalendarUncheckedCreateInput) {
  //   // Because userId_integration_externalId_eventTypeId is a unique constraint but with eventTypeId being nullable.
  //   // We can't use upsert here
  //   // We have to ensure at all places(which we do) that an entry doesn't exist already before creating a new one
  //   const existingSelectedCalendars = await prisma.selectedCalendar.findMany({
  //     where: {
  //       userId: data.userId,
  //       integration: data.integration,
  //       externalId: data.externalId,
  //     },
  //   });

  //   if (existingSelectedCalendars.length > 0) {
  //     return await prisma.selectedCalendar.updateMany({
  //       where: {
  //         id: {
  //           in: existingSelectedCalendars.map((sc) => sc.id),
  //         },
  //       },
  //       data,
  //     });
  //   }

  //   return await prisma.selectedCalendar.create({
  //     data: {
  //       ...data,
  //     },
  //   });
  // }

  static async createIfNotExists(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    const existingSelectedCalendar = await prisma.selectedCalendar.findFirst({
      where: {
        userId: data.userId,
        integration: data.integration,
        externalId: data.externalId,
        eventTypeId: data.eventTypeId || null,
      },
    });

    if (existingSelectedCalendar) return existingSelectedCalendar;
    return await prisma.selectedCalendar.create({
      data,
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
        OR: [
          // Either is a calendar pending to be watched
          { googleChannelExpiration: null },
          // Or is a calendar that is about to expire
          { googleChannelExpiration: { lt: tomorrowTimestamp } },
        ],
      },
    });
    return nextBatch;
  }
  /**
   * Retrieve calendars that are being watched but shouldn't be anymore
   * e.g. when a user disables calendar cache for the organization
   */
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
  static async delete({ where }: { where: Prisma.SelectedCalendarUncheckedCreateInput }) {
    return await prisma.selectedCalendar.deleteMany({
      where: {
        userId: where.userId,
        externalId: where.externalId,
        integration: where.integration,
        eventTypeId: where.eventTypeId ?? null,
      },
    });
  }
  static async findMany(args: Prisma.SelectedCalendarFindManyArgs) {
    return await prisma.selectedCalendar.findMany(args);
  }
  static async findFirstByGoogleChannelId(googleChannelId: string) {
    return await prisma.selectedCalendar.findFirst({
      where: {
        googleChannelId,
      },
      select: {
        credential: {
          select: {
            ...credentialForCalendarServiceSelect,
            selectedCalendars: {
              orderBy: {
                externalId: "asc",
              },
            },
          },
        },
      },
    });
  }

  static async findFirst({ where }: { where: Prisma.SelectedCalendarWhereInput }) {
    return await prisma.selectedCalendar.findFirst({
      where,
    });
  }
}
