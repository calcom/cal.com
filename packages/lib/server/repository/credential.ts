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

// Allows us to explicitly set delegatedToId to null instead of not setting it.
// Once every credential from Credential table has delegatedToId:null available like this, we can make delegatedToId a required field instead of optional
// It makes us avoid a scenario where on a DWD credential we accidentally forget to set delegatedToId and think of it as non-dwd credential due to that
export const withDelegatedToIdNull = <T extends Record<string, unknown> | null>(credential: T) => {
  type WithDelegatedCredential = T extends null
    ? null
    : T & {
        delegatedTo: null;
        delegatedToId: null;
      };

  if (!credential) return null as WithDelegatedCredential;
  return {
    ...credential,
    delegatedTo: null,
    delegatedToId: null,
  } as WithDelegatedCredential;
};

export const withDelegatedToIdNullArray = <T extends Record<string, unknown>>(credentials: T[]) => {
  return credentials.map(withDelegatedToIdNull).filter((credential) => !!credential) as (T & {
    delegatedTo: null;
    delegatedToId: null;
  })[];
};

export class CredentialRepository {
  static async create(data: CredentialCreateInput) {
    const credential = await prisma.credential.create({ data: { ...data } });
    return withDelegatedToIdNull(credential);
  }
  static async findByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    const credential = await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
    return withDelegatedToIdNull(credential);
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    const credential = await prisma.credential.findFirst({ where: { id }, select: safeCredentialSelect });
    return withDelegatedToIdNull(credential);
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    const credential = await prisma.credential.findFirst({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
    return withDelegatedToIdNull(credential);
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
    return withDelegatedToIdNull(credential);
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }

  static async findCredentialForCalendarServiceById({ id }: { id: number }) {
    const dbCredential = await prisma.credential.findUnique({
      where: { id },
      select: credentialForCalendarServiceSelect,
    });

    const credentialForCalendarService = await getCredentialForCalendarService(
      withDelegatedToIdNull(dbCredential)
    );
    return credentialForCalendarService;
  }
}
