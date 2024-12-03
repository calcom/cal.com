import type { Prisma } from "@prisma/client";

import { isDomainWideDelegationCredential } from "@calcom/lib/domainWideDelegation/clientAndServer";
import { prisma } from "@calcom/prisma";

function buildCredentialPayload({
  credentialId,
  domainWideDelegationCredentialId,
}: {
  credentialId: number | null;
  domainWideDelegationCredentialId: string | null;
}) {
  return {
    ...(!isDomainWideDelegationCredential({ credentialId })
      ? {
          credentialId,
        }
      : {
          domainWideDelegationCredentialId,
        }),
  };
}

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
    const credentialPayloadForUpdate = buildCredentialPayload({
      credentialId: update.credentialId ?? null,
      domainWideDelegationCredentialId: update.domainWideDelegationCredentialId ?? null,
    });

    const credentialPayloadForCreate = buildCredentialPayload({
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
