import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { SelectedCalendarEventTypeIds } from "@calcom/types/Calendar";

import { buildCredentialPayloadForPrisma } from "../buildCredentialPayloadForCalendar";

export type UpdateArguments = {
  where: FindManyArgs["where"];
  data: Prisma.SelectedCalendarUpdateManyArgs["data"];
};
export type FindManyArgs = {
  // https://github.com/microsoft/TypeScript/issues/55217 It crashes atoms build with this if we become too generic here. Seems like a TS bug with complex prisma types.
  where?: {
    userId?:
      | number
      | {
          in: number[];
        };
    credentialId?: number | null;
    integration?: string;
    externalId?: string;
    eventTypeId?: number | null;
    googleChannelId?:
      | string
      | null
      | {
          not: null;
        };
  };
  orderBy?: {
    userId?: "asc" | "desc";
  };
  select?: Prisma.SelectedCalendarSelect;
};

const ensureUserLevelWhere = {
  eventTypeId: null,
};

export class SelectedCalendarRepository {
  private static async findConflicting(data: {
    userId: number;
    integration: string;
    externalId: string;
    eventTypeId?: number | null;
  }) {
    // Because userId_integration_externalId_eventTypeId is a unique constraint but with eventTypeId being nullable,
    // it allows for multiple entries with the same (userId, integration, externalId) with eventTypeId=null in DB.
    // We restrict it at app level by ensuring that an entry doesn't exist already before creating a new one
    return await SelectedCalendarRepository.findFirst({
      where: {
        userId: data.userId,
        integration: data.integration,
        externalId: data.externalId,
        eventTypeId: data.eventTypeId || null,
      },
    });
  }

  static async findById(id: string) {
    return await prisma.selectedCalendar.findUnique({ where: { id } });
  }

  static async create(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    const conflictingCalendar = await SelectedCalendarRepository.findConflicting(data);

    if (conflictingCalendar) {
      throw new Error(
        `Selected calendar already exists for userId: ${data.userId}, integration: ${data.integration}, externalId: ${data.externalId}, eventTypeId: ${data.eventTypeId}`
      );
    }

    return await prisma.selectedCalendar.create({
      data: {
        ...data,
      },
    });
  }

  static async upsert(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    // userId_integration_externalId_eventTypeId is a unique constraint but with eventTypeId being nullable
    // So, this unique constraint can't be used in upsert. Prisma doesn't allow that, So, we do create and update separately
    const credentialPayload = buildCredentialPayloadForPrisma({
      credentialId: data.credentialId,
      delegationCredentialId: data.delegationCredentialId,
    });

    const newData = {
      ...data,
      ...credentialPayload,
    };

    const conflictingCalendar = await SelectedCalendarRepository.findConflicting(newData);
    if (conflictingCalendar) {
      return await prisma.selectedCalendar.update({
        where: {
          id: conflictingCalendar.id,
        },
        data: newData,
      });
    }

    return await prisma.selectedCalendar.create({
      data: newData,
    });
  }

  static async delete({ where }: { where: Prisma.SelectedCalendarUncheckedCreateInput }) {
    const calendarsToDelete = await SelectedCalendarRepository.findMany({ where });

    if (calendarsToDelete.length === 0) {
      // Same behaviour as Prisma.delete as it throws error if no record is found
      throw new Error("SelectedCalendar not found");
    }

    if (calendarsToDelete.length > 1) {
      throw new Error("Multiple SelectedCalendar records found to delete. deleteMany should be used instead");
    }

    // We can't use delete because unique constraint on userId_integration_externalId_eventTypeId has eventTypeId as nullable
    return await prisma.selectedCalendar.delete({
      where: {
        id: calendarsToDelete[0].id,
      },
    });
  }

  static async deleteById({ id }: { id: string }) {
    return await prisma.selectedCalendar.delete({
      where: {
        id,
      },
    });
  }

  static async createIfNotExists(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    const conflictingCalendar = await SelectedCalendarRepository.findConflicting(data);

    if (conflictingCalendar) return conflictingCalendar;
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
                    enabled: true,
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
              // Either is a calendar that has not errored
              { error: null },
              // Or is a calendar that has errored but has not reached max attempts
              {
                error: { not: null },
                watchAttempts: {
                  lt: {
                    // @ts-expect-error - _ref is a Prisma extension field
                    _ref: "maxAttempts",
                    _container: "SelectedCalendar",
                  },
                },
              },
            ],
          },
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
  /**
   * Retrieve calendars that are being watched but shouldn't be anymore
   * e.g. when a user disables calendar cache for the organization
   */
  static async getNextBatchToUnwatch(limit = 100) {
    const where: Prisma.SelectedCalendarWhereInput = {
      // RN we only support google calendar subscriptions for now
      integration: "google_calendar",
      googleChannelExpiration: { not: null },
      AND: [
        {
          OR: [
            // Either is a calendar that has not errored during unwatch
            { error: null },
            // Or is a calendar that has errored during unwatch but has not reached max attempts
            {
              error: { not: null },
              unwatchAttempts: {
                lt: {
                  // @ts-expect-error - _ref is a Prisma extension field
                  _ref: "maxAttempts",
                  _container: "SelectedCalendar",
                },
              },
            },
          ],
        },
        {
          user: {
            teams: {
              every: {
                team: {
                  features: {
                    none: {
                      featureId: "calendar-cache",
                      enabled: true,
                    },
                  },
                },
              },
            },
          },
        },
      ],
    };
    // If calendar cache is disabled globally, we skip team features and unwatch all subscriptions
    const nextBatch = await prisma.selectedCalendar.findMany({
      take: limit,
      where,
    });
    return nextBatch;
  }

  static async findMany({ where, select, orderBy }: FindManyArgs) {
    const args = {
      where,
      select,
      orderBy,
    } satisfies Prisma.SelectedCalendarFindManyArgs;
    return await prisma.selectedCalendar.findMany(args);
  }

  static async findUniqueOrThrow({ where }: { where: Prisma.SelectedCalendarWhereInput }) {
    const calendars = await prisma.selectedCalendar.findMany({ where });
    if (calendars.length === 0) {
      throw new Error("SelectedCalendar not found");
    }
    return calendars[0];
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

  static async findFirstOrThrow({ where }: { where: Prisma.SelectedCalendarWhereInput }) {
    const calendar = await SelectedCalendarRepository.findFirst({ where });
    if (!calendar) {
      throw new Error("SelectedCalendar not found");
    }
    return calendar;
  }

  static async update(args: UpdateArguments) {
    const calendarsToUpdate = await SelectedCalendarRepository.findMany({ where: args.where });

    if (calendarsToUpdate.length === 0) {
      throw new Error("SelectedCalendar not found");
    }

    if (calendarsToUpdate.length > 1) {
      throw new Error("Multiple SelectedCalendar records found to update. updateMany should be used instead");
    }

    const calendarToUpdate = calendarsToUpdate[0];

    return await prisma.selectedCalendar.update({
      where: {
        id: calendarToUpdate.id,
      },
      data: args.data,
    });
  }

  /**
   * Following methods ensure that they operate on user level calendars only
   */
  static async findUserLevelUniqueOrThrow({ where }: { where: Prisma.SelectedCalendarWhereInput }) {
    const calendars = await SelectedCalendarRepository.findUniqueOrThrow({
      where: {
        ...where,
        ...ensureUserLevelWhere,
      },
    });

    if (!calendars) {
      throw new Error("SelectedCalendar not found");
    }
    return calendars;
  }

  static async findManyUserLevel(args: FindManyArgs) {
    return SelectedCalendarRepository.findMany({
      ...args,
      where: {
        ...args.where,
        ...ensureUserLevelWhere,
      },
    });
  }

  static async updateUserLevel(args: UpdateArguments) {
    return SelectedCalendarRepository.update({
      where: {
        ...args.where,
        ...ensureUserLevelWhere,
      },
      data: args.data,
    });
  }

  static async deleteUserLevel({ where }: { where: Prisma.SelectedCalendarUncheckedCreateInput }) {
    return await SelectedCalendarRepository.delete({
      where: {
        ...where,
        ...ensureUserLevelWhere,
      },
    });
  }

  static async upsertManyForEventTypeIds({
    data,
    eventTypeIds,
  }: {
    data: Prisma.SelectedCalendarUncheckedCreateInput;
    eventTypeIds: SelectedCalendarEventTypeIds;
  }) {
    const userId = data.userId;
    return await Promise.all(
      eventTypeIds.map((eventTypeId) =>
        SelectedCalendarRepository.upsert({
          ...data,
          eventTypeId,
          userId,
          integration: data.integration,
          externalId: data.externalId,
          credentialId: data.credentialId,
        })
      )
    );
  }
  static async updateById(id: string, data: Prisma.SelectedCalendarUpdateInput) {
    return await prisma.selectedCalendar.update({
      where: { id },
      data,
    });
  }

  static async updateManyByCredentialId(credentialId: number, data: Prisma.SelectedCalendarUpdateInput) {
    return await prisma.selectedCalendar.updateMany({
      where: { credentialId },
      data,
    });
  }

  static async setErrorInWatching({ id, error }: { id: string; error: string }) {
    await SelectedCalendarRepository.updateById(id, {
      error,
      lastErrorAt: new Date(),
      watchAttempts: { increment: 1 },
    });
  }

  static async setErrorInUnwatching({ id, error }: { id: string; error: string }) {
    await SelectedCalendarRepository.updateById(id, {
      error,
      lastErrorAt: new Date(),
      unwatchAttempts: { increment: 1 },
    });
  }

  static async removeWatchingError({ id }: { id: string }) {
    await SelectedCalendarRepository.updateById(id, {
      error: null,
      lastErrorAt: null,
      watchAttempts: 0,
    });
  }

  static async removeUnwatchingError({ id }: { id: string }) {
    await SelectedCalendarRepository.updateById(id, {
      error: null,
      lastErrorAt: null,
      unwatchAttempts: 0,
    });
  }
}
