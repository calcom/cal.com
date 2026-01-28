import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { buildNonDelegationCredential } from "@calcom/lib/delegationCredential";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { AppCategories } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect, safeCredentialSelect } from "@calcom/prisma/selects/credential";

const log = logger.getSubLogger({ prefix: ["CredentialRepository"] });

type CredentialCreateInput = {
  type: string;
  key: object;
  userId: number;
  appId: string;
  delegationCredentialId?: string | null;
};

type CredentialUpdateInput = {
  type?: string;
  key?: object;
  userId?: number;
  appId?: string;
  delegationCredentialId?: string | null;
  invalid?: boolean;
};

export class CredentialRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findByCredentialId(id: number) {
    return this.prismaClient.credential.findUnique({
      where: { id },
      select: safeCredentialSelect,
    });
  }

  async findByIdWithDelegationCredential(id: number) {
    return this.prismaClient.credential.findUnique({
      where: { id },
      select: {
        ...credentialForCalendarServiceSelect,
        delegationCredential: true,
      },
    });
  }

  static async create(data: CredentialCreateInput) {
    const credential = await prisma.credential.create({ data: { ...data } });
    return buildNonDelegationCredential(credential);
  }
  static async findByAppIdAndUserId({
    appId,
    userId,
  }: {
    appId: string;
    userId: number;
  }) {
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
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: safeCredentialSelect,
    });
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

  static async findFirstByAppIdAndUserId({
    appId,
    userId,
  }: {
    appId: string;
    userId: number;
  }) {
    return await prisma.credential.findFirst({
      where: {
        appId,
        userId,
      },
    });
  }

  static async findFirstByUserIdAndType({
    userId,
    type,
  }: {
    userId: number;
    type: string;
  }) {
    const credential = await prisma.credential.findFirst({
      where: { userId, type },
    });
    return buildNonDelegationCredential(credential);
  }

  static async findManyByUserIdOrTeamIdAndCategory({
    category,
    userId,
    teamId,
  }: {
    category: AppCategories[];
    userId?: number;
    teamId?: number;
  }) {
    if (!userId && !teamId) return null;

    const where: Prisma.CredentialWhereInput = {
      app: {
        categories: {
          hasSome: category,
        },
      },
    };

    if (userId) {
      where.userId = userId;
    }

    if (teamId) {
      where.teamId = teamId;
    }

    const credentials = await prisma.credential.findMany({
      where,
      select: credentialForCalendarServiceSelect,
    });
    return credentials.map((credential) => buildNonDelegationCredential(credential));
  }

  /**
   * Fetches credentials for a user by category, including credentials from:
   * 1. User's own credentials
   * 2. Team credentials (from teams the user is a member of)
   * 3. Organization credentials (using Profile model, not deprecated user.organizationId)
   */
  static async findCredentialsByUserIdAndCategory({
    userId,
    category,
  }: {
    userId: number;
    category: AppCategories[];
  }) {
    const credentials = [];

    // 1. Get user's own credentials
    const userCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
      userId,
      category,
    });

    if (userCredentials) {
      credentials.push(...userCredentials);
    }

    // 2. Get team credentials
    const userTeams = await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    });

    for (const membership of userTeams) {
      const teamCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
        teamId: membership.teamId,
        category,
      });
      if (teamCredentials) credentials.push(...teamCredentials);
    }

    // 3. Get organization credentials using Profile (not deprecated user.organizationId)
    const organizationId = await ProfileRepository.findFirstOrganizationIdForUser({ userId });

    if (organizationId) {
      const orgCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
        teamId: organizationId,
        category,
      });
      if (orgCredentials) credentials.push(...orgCredentials);
    }

    return credentials;
  }

  /**
   * Fetches the highest priority HRMS credential for a user.
   * Priority order: Organization > Team > User
   * Returns only a single credential (the first found with highest priority).
   */
  static async findFirstHrmsCredentialByPriority({
    userId,
    category,
  }: {
    userId: number;
    category: AppCategories[];
  }) {
    // 1. First check organization credentials (highest priority)
    const organizationId = await ProfileRepository.findFirstOrganizationIdForUser({ userId });

    if (organizationId) {
      const orgCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
        teamId: organizationId,
        category,
      });
      if (orgCredentials && orgCredentials.length > 0) {
        return orgCredentials[0];
      }
    }

    // 2. Then check team credentials
    const userTeams = await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    });

    for (const membership of userTeams) {
      const teamCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
        teamId: membership.teamId,
        category,
      });
      if (teamCredentials && teamCredentials.length > 0) {
        return teamCredentials[0];
      }
    }

    // 3. Finally check user's own credentials (lowest priority)
    const userCredentials = await CredentialRepository.findManyByUserIdOrTeamIdAndCategory({
      userId,
      category,
    });

    if (userCredentials && userCredentials.length > 0) {
      return userCredentials[0];
    }

    return null;
  }

  static async findManyByCategoryAndAppSlug({
    category,
    appSlug,
  }: {
    category: AppCategories[];
    appSlug: string;
  }) {
    const credentials = await prisma.credential.findMany({
      where: {
        app: {
          categories: {
            hasSome: category,
          },
          slug: appSlug,
        },
      },
      select: {
        id: true,
        key: true,
        appId: true,
        userId: true,
        teamId: true,
        type: true,
        invalid: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
    return credentials.map((credential) => ({
      ...credential,
      delegationCredentialId: null,
    }));
  }

  static async deleteById({ id }: { id: number }) {
    await prisma.credential.delete({ where: { id } });
  }

  static async updateCredentialById({
    id,
    data,
  }: {
    id: number;
    data: CredentialUpdateInput;
  }) {
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
      select: {
        ...credentialForCalendarServiceSelect,
        delegationCredential: true,
      },
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

  static async findAllDelegationByTypeIncludeUserAndTake({
    type,
    take,
  }: {
    type: string;
    take: number;
  }) {
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
    return delegationUserCredentials.map(
      ({ delegationCredentialId, ...rest }) => {
        return {
          ...rest,
          // We queried only those where delegationCredentialId is not null

          delegationCredentialId: delegationCredentialId!,
        };
      }
    );
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
      log.error(
        `DelegationCredential: Multiple delegation user credentials found - this should not happen`,
        {
          userId,
          delegationCredentialId,
        }
      );
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
    return prisma.credential.create({
      data: { userId, delegationCredentialId, type, key, appId },
    });
  }

  static async updateWhereId({
    id,
    data,
  }: {
    id: number;
    data: { key: Prisma.InputJsonValue };
  }) {
    return prisma.credential.update({ where: { id }, data });
  }

  static async findPaymentCredentialByAppIdAndTeamId({
    appId,
    teamId,
  }: {
    appId: string | null;
    teamId: number;
  }) {
    return await prisma.credential.findFirst({
      where: {
        teamId,
        appId,
      },
      include: {
        app: true,
      },
    });
  }

  static async findPaymentCredentialByAppIdAndUserId({
    appId,
    userId,
  }: {
    appId: string | null;
    userId: number;
  }) {
    return await prisma.credential.findFirst({
      where: {
        userId,
        appId,
      },
      include: {
        app: true,
      },
    });
  }

  static async findPaymentCredentialByAppIdAndUserIdOrTeamId({
    appId,
    userId,
    teamId,
  }: {
    appId: string | null;
    userId: number;
    teamId?: number | null;
  }) {
    const idToSearchObject = teamId ? { teamId } : { userId };
    return await prisma.credential.findFirst({
      where: {
        ...idToSearchObject,
        appId,
      },
      include: {
        app: true,
      },
    });
  }

  findByTeamIdAndSlugs({ teamId, slugs }: { teamId: number; slugs: string[] }) {
    return this.prismaClient.credential.findMany({
      where: {
        teamId,
        appId: {
          in: slugs,
        },
      },
      select: { ...safeCredentialSelect, team: { select: { name: true } } },
    });
  }

  findByIdAndTeamId({ id, teamId }: { id: number; teamId: number }) {
    return this.prismaClient.credential.findFirst({
      where: {
        id,
        teamId,
      },
      select: {
        ...safeCredentialSelect,
        app: {
          select: {
            slug: true,
          },
        },
      },
    });
  }

  async findByAppIdAndKeyValue({
    appId,
    keyPath,
    value,
    keyFields,
  }: {
    appId: string;
    keyPath: string[];
    value: Prisma.InputJsonValue;
    keyFields?: string[];
  }) {
    const credential = await this.prismaClient.credential.findFirst({
      where: {
        appId,
        key: {
          path: keyPath,
          equals: value,
        },
      },
      select: {
        ...safeCredentialSelect,
        integrationAttributeSyncs: {
          select: {
            id: true,
            attributeSyncRule: {
              select: {
                id: true,
                rule: true,
              },
            },
            syncFieldMappings: {
              select: {
                id: true,
                integrationFieldName: true,
                attributeId: true,
                enabled: true,
              },
            },
          },
        },
        key: keyFields ? true : false,
      },
    });

    if (!credential || !keyFields) {
      return credential;
    }

    const key = credential.key as Record<string, unknown>;
    const filteredKey = keyFields.reduce((acc, field) => {
      if (field in key) {
        acc[field] = key[field];
      }
      return acc;
    }, {} as Record<string, unknown>);

    return { ...credential, key: filteredKey };
  }
}
