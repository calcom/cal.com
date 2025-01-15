import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { buildNonDwdCredential } from "../../domainWideDelegation/server";

type CredentialCreateInput = {
  type: string;
  key: any;
  userId: number;
  appId: string;
};

export class CredentialRepository {
  static async create(data: CredentialCreateInput) {
    const credential = await prisma.credential.create({ data: { ...data } });
    return buildNonDwdCredential(credential);
  }
  static async findByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    const credential = await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
    return buildNonDwdCredential(credential);
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    const credential = await prisma.credential.findFirst({ where: { id }, select: safeCredentialSelect });
    return buildNonDwdCredential(credential);
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    const credential = await prisma.credential.findFirst({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
    return buildNonDwdCredential(credential);
  }

  static async findFirstByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    return await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
  }

  static async findFirstByUserIdAndType({ userId, type }: { userId: number; type: string }) {
    const credential = await prisma.credential.findFirst({ where: { userId, type } });
    return buildNonDwdCredential(credential);
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }

  static async findCredentialForCalendarServiceById({ id }: { id: number }) {
    const dbCredential = await prisma.credential.findUnique({
      where: { id },
      select: credentialForCalendarServiceSelect,
    });

    if (!dbCredential) {
      return dbCredential;
    }

    return buildNonDwdCredential(dbCredential);
  }
}
