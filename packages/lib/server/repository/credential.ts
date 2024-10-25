import type { Prisma } from "@prisma/client";
import type { Credential as PrismaCredential } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";

import { BookingReferenceRepository } from "./bookingReference";

type ICredential = Prisma.CredentialCreateInput & {
  userId?: PrismaCredential["userId"];
  appId?: PrismaCredential["appId"];
  teamId?: PrismaCredential["teamId"];
};

export class CredentialRepository {
  private static generateCreateCredentialData = (credentialCreateData: ICredential) => {
    const { userId, appId, teamId, ...rest } = credentialCreateData;
    return {
      ...rest,
      ...(userId ? { user: { connect: { id: userId } } } : null),
      ...(appId ? { app: { connect: { slug: appId } } } : null),
      ...(teamId ? { team: { connect: { id: teamId } } } : null),
    };
  };

  static async create(data: ICredential) {
    const newCredential = await prisma.credential.create({
      data: this.generateCreateCredentialData(data),
      include: {
        selectedCalendars: {
          select: {
            externalId: true,
          },
        },
      },
    });
    await BookingReferenceRepository.reconnectWithNewCredential(newCredential.id);
    return newCredential;
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({ where: { id }, select: safeCredentialSelect });
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    return await prisma.credential.findFirst({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
  }

  static async findByIdWithSelectedCalendar({ id }: { id: number }) {
    return await prisma.credential.findFirst({
      where: { id },
      select: {
        ...safeCredentialSelect,
        selectedCalendars: {
          select: {
            externalId: true,
          },
        },
      },
    });
  }
}
