import type { Prisma } from "@prisma/client";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { safeCredentialSelect } from "@calcom/prisma/selects/credential";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { buildNonDelegationCredential } from "../../delegationCredential/server";

const log = logger.getSubLogger({ prefix: ["CredentialRepository"] });

type CredentialCreateInput = {
  type: string;
  key: any;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
};

type CredentialUpdateInput = {
  type?: string;
  key?: any;
  userId?: number;
  appId?: string;
  delegationCredentialId?: string | null;
  invalid?: boolean;
};

export class CredentialRepository {
  static async create(data: CredentialCreateInput) {
    const credential = await prisma.credential.create({ data: { ...data } });
    return buildNonDelegationCredential(credential);
  }
  static async findByAppIdAndUserId({ appId, userId }: { appId: string; userId: number }) {
    const credential = await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
    return buildNonDelegationCredential(credential);
  }

  /**
   * Doesn't retrieve key field as that has credentials
   */
  static async findFirstByIdWithUser({ id }: { id: number }) {
    const credential = await prisma.credential.findUnique({ where: { id }, select: safeCredentialSelect });
    return buildNonDelegationCredential(credential);
  }

  /**
   * Includes 'key' field which is sensitive data.
   */
  static async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: { ...safeCredentialSelect, key: true },
    });
    return buildNonDelegationCredential(credential);
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
    return buildNonDelegationCredential(credential);
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }

  static async updateCredentialById({ id, data }: { id: number; data: CredentialUpdateInput }) {
    await prisma.credential.update({
      where: { id },
      data,
    });
  }

  static async deleteAllByDelegationCredentialId({
    delegationCredentialId,
  }: {
    delegationCredentialId: string;
  }) {
    return prisma.credential.deleteMany({ where: { delegationCredentialId } });
  }

  static async findCredentialForCalendarServiceById({ id }: { id: number }) {
    const dbCredential = await prisma.credential.findUnique({
      where: { id },
      select: credentialForCalendarServiceSelect,
    });

    if (!dbCredential) {
      return dbCredential;
    }

    return buildNonDelegationCredential(dbCredential);
  }

  static async findByIdIncludeDelegationCredential({ id }: { id: number }) {
    const dbCredential = await prisma.credential.findUnique({
      where: { id },
      select: { ...credentialForCalendarServiceSelect, delegationCredential: true },
    });

    return dbCredential;
  }

  static async findAllDelegationByUserIdsListAndDelegationCredentialIdAndType({
    userIds,
    delegationCredentialId,
    type,
  }: {
    userIds: number[];
    delegationCredentialId: string;
    type: string;
  }) {
    return prisma.credential.findMany({
      where: {
        userId: {
          in: userIds,
        },
        delegationCredentialId,
        type,
      },
      select: {
        userId: true,
      },
    });
  }

  static async findAllDelegationByTypeIncludeUserAndTake({ type, take }: { type: string; take: number }) {
    const delegationUserCredentials = await prisma.credential.findMany({
      where: {
        delegationCredentialId: { not: null },
        type,
      },
      include: {
        user: {
          select: {
            email: true,
            id: true,
          },
        },
      },
      take,
    });
    return delegationUserCredentials.map(({ delegationCredentialId, ...rest }) => {
      return {
        ...rest,
        // We queried only those where delegationCredentialId is not null
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        delegationCredentialId: delegationCredentialId!,
      };
    });
  }

  static async findUniqueByUserIdAndDelegationCredentialId({
    userId,
    delegationCredentialId,
  }: {
    userId: number;
    delegationCredentialId: string;
  }) {
    const delegationUserCredentials = await prisma.credential.findMany({
      where: {
        userId,
        delegationCredentialId,
      },
    });

    if (delegationUserCredentials.length > 1) {
      // Instead of crashing use the first one and log for observability
      // TODO: Plan to add a unique constraint on userId and delegationCredentialId
      log.error(`DelegationCredential: Multiple delegation user credentials found - this should not happen`, {
        userId,
        delegationCredentialId,
      });
    }

    return delegationUserCredentials[0];
  }

  static async updateWhereUserIdAndDelegationCredentialId({
    userId,
    delegationCredentialId,
    data,
  }: {
    userId: number;
    delegationCredentialId: string;
    data: {
      key: Prisma.InputJsonValue;
    };
  }) {
    return prisma.credential.updateMany({
      where: {
        userId,
        delegationCredentialId,
      },
      data,
    });
  }

  static async createDelegationCredential({
    userId,
    delegationCredentialId,
    type,
    key,
    appId,
  }: {
    userId: number;
    delegationCredentialId: string;
    type: string;
    key: Prisma.InputJsonValue;
    appId: string;
  }) {
    return prisma.credential.create({ data: { userId, delegationCredentialId, type, key, appId } });
  }

  static async updateWhereId({ id, data }: { id: number; data: { key: Prisma.InputJsonValue } }) {
    return prisma.credential.update({ where: { id }, data });
  }
}
