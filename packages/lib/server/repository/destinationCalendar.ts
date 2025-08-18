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

  static async createIfNotExistsForUser(
    data: { userId: number } & Prisma.DestinationCalendarUncheckedCreateInput
  ) {
    const conflictingCalendar = await DestinationCalendarRepository.findConflictingForUser(data);
    if (conflictingCalendar) {
      return conflictingCalendar;
    }
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

  private static async findConflictingForUser(data: {
    userId: number;
    integration: string;
    externalId: string;
  }) {
    return await DestinationCalendarRepository.find({
      where: {
        userId: data.userId,
        integration: data.integration,
        externalId: data.externalId,
        eventTypeId: null,
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
}
