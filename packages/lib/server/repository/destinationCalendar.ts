import type { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { buildCredentialPayloadForPrisma } from "../buildCredentialPayloadForCalendar";

const log = logger.getSubLogger({ prefix: ["DestinationCalendarRepository"] });

export class DestinationCalendarRepository {
  static async create(data: Prisma.DestinationCalendarCreateInput) {
    return await prisma.destinationCalendar.create({
      data,
    });
  }

  static async getByUserId(userId: number) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        userId,
      },
    });
  }

  static async getByEventTypeId(eventTypeId: number) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        eventTypeId,
      },
    });
  }

  static async find({ where }: { where: Prisma.DestinationCalendarWhereInput }) {
    return await prisma.destinationCalendar.findFirst({
      where,
    });
  }

  static async findFirstByGoogleChannelIdAndResourceId(googleChannelId: string, googleResourceId: string) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        googleChannelId,
        googleChannelResourceId: googleResourceId,
      },
      select: {
        id: true,
        externalId: true,
        credential: {
          select: {
            id: true,
            appId: true,
            type: true,
            key: true,
            invalid: true,
            userId: true,
          },
        },
      },
    });
  }

  static async upsert({
    where,
    update,
    create,
  }: {
    where: Prisma.DestinationCalendarUpsertArgs["where"];
    update: {
      integration?: string;
      externalId?: string;
      credentialId?: number | null;
      primaryEmail?: string | null;
      delegationCredentialId?: string | null;
    };
    create: {
      integration: string;
      externalId: string;
      credentialId: number | null;
      primaryEmail?: string | null;
      delegationCredentialId?: string | null;
    };
  }) {
    log.debug("upsert", { where, update, create });
    const credentialPayloadForUpdate = buildCredentialPayloadForPrisma({
      credentialId: update.credentialId,
      delegationCredentialId: update.delegationCredentialId,
    });

    const credentialPayloadForCreate = buildCredentialPayloadForPrisma({
      credentialId: create.credentialId,
      delegationCredentialId: create.delegationCredentialId,
    });

    return await prisma.destinationCalendar.upsert({
      where,
      update: {
        ...update,
        ...credentialPayloadForUpdate,
      },
      create: {
        ...create,
        ...credentialPayloadForCreate,
      },
    });
  }

  static async getNextBatchToWatch(batchSize: number) {
    const oneDayInMS = 24 * 60 * 60 * 1000;
    const tomorrowTimestamp = String(new Date().getTime() + oneDayInMS);
    return await prisma.destinationCalendar.findMany({
      take: batchSize,
      where: {
        OR: [
          // Either is a calendar pending to be watched
          { googleChannelExpiration: null },
          // Or is a calendar that is about to expire
          { googleChannelExpiration: { lt: tomorrowTimestamp } },
        ],
        // RN we only support google calendar subscriptions for now
        integration: "google_calendar",
        user: {
          teams: {
            some: {
              team: {
                features: {
                  some: {
                    featureId: "bi-directional-calendar-sync",
                  },
                },
              },
            },
          },
        },
        credentialId: {
          not: null,
        },
        credential: {
          invalid: {
            not: true,
          },
        },
      },
      select: {
        id: true,
        externalId: true,
        credentialId: true,
        integration: true,
        userId: true, // Needed for potential logging or context
        eventTypeId: true,
      },
    });
  }

  static async updateById(id: string, data: Prisma.DestinationCalendarUpdateInput) {
    return await prisma.destinationCalendar.update({
      where: { id },
      data,
    });
  }

  static async updateMany({
    where,
    data,
  }: {
    where: Prisma.DestinationCalendarWhereInput;
    data: Prisma.DestinationCalendarUpdateManyMutationInput;
  }) {
    return await prisma.destinationCalendar.updateMany({ where, data });
  }

  static async findFirstWatchedByExternalId(externalId: string, integration: string) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        externalId,
        integration,
        googleChannelId: { not: null },
        googleChannelResourceId: { not: null },
        googleChannelExpiration: { not: null },
      },
      select: {
        googleChannelId: true,
        googleChannelResourceId: true,
        googleChannelExpiration: true,
        googleChannelKind: true,
        googleChannelResourceUri: true,
        lastProcessedTime: true,
      },
    });
  }
}
