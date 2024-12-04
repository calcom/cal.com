import { getCredentialForCalendarService } from "@calcom/core/CalendarManager";
import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

type CredentialCreateInput = {
  type: string;
  key: any;
  userId: number;
  appId: string;
};

export class CredentialRepository {
  static async create(data: CredentialCreateInput) {
    return await prisma.credential.create({ data: { ...data } });
  }
  static async findByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    return await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
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

  static async findFirstByUserIdAndType({ userId, type }: { userId: number; type: string }) {
    return await prisma.credential.findFirst({ where: { userId, type } });
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }

  static async findCredentialForCalendarServiceById({ id }: { id: number }) {
    const dbCredential = await prisma.credential.findUnique({
      where: { id },
      select: credentialForCalendarServiceSelect,
    });

    if (!dbCredential) return null;

    const credentialForCalendarService = await getCredentialForCalendarService({
      ...dbCredential,
      delegatedToId: null,
    });
    return credentialForCalendarService;
  }
}
