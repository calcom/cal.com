import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { buildCredentialPayloadForCalendar } from "../buildCredentialPayloadForCalendar";

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
      domainWideDelegationCredentialId?: string | null;
    };
    create: {
      integration: string;
      externalId: string;
      credentialId: number | null;
      primaryEmail?: string | null;
      domainWideDelegationCredentialId?: string | null;
    };
  }) {
    const credentialPayloadForUpdate = buildCredentialPayloadForCalendar({
      credentialId: update.credentialId ?? null,
      domainWideDelegationCredentialId: update.domainWideDelegationCredentialId ?? null,
    });

    const credentialPayloadForCreate = buildCredentialPayloadForCalendar({
      credentialId: create.credentialId ?? null,
      domainWideDelegationCredentialId: create.domainWideDelegationCredentialId ?? null,
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
