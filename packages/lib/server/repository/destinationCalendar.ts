import { Prisma } from "@prisma/client";

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

  static async createIfNotExistsForUser(
    data: { userId: number } & Prisma.DestinationCalendarUncheckedCreateInput
  ) {
    const credentialPayload = buildCredentialPayloadForPrisma({
      credentialId: data.credentialId,
      delegationCredentialId: data.delegationCredentialId,
    });

    try {
      return await prisma.destinationCalendar.upsert({
        where: {
          userId: data.userId,
        },
        create: {
          userId: data.userId,
          integration: data.integration,
          externalId: data.externalId,
          primaryEmail: data.primaryEmail,
          ...credentialPayload,
        },
        update: {
          integration: data.integration,
          externalId: data.externalId,
          primaryEmail: data.primaryEmail,
          ...credentialPayload,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        log.warn("destinationCalendar upsert hit P2002, reconciling by userId", {
          userId: data.userId,
          target: error.meta?.target,
        });

        return await prisma.destinationCalendar.update({
          where: {
            userId: data.userId,
          },
          data: {
            integration: data.integration,
            externalId: data.externalId,
            primaryEmail: data.primaryEmail,
            ...credentialPayload,
          },
        });
      }

      throw error;
    }
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
}
