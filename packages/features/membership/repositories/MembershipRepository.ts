import { LookupTarget, ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { eventTypeSelect } from "@calcom/lib/server/eventTypeSelect";
import { availabilityUserSelect, prisma, type PrismaTransaction } from "@calcom/prisma";
import type { Prisma, Membership, PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const log = logger.getSubLogger({ prefix: ["features/membership/repositories/MembershipRepository"] });
type IMembership = {
  teamId: number;
  userId: number;
  accepted: boolean;
  role: MembershipRole;
  createdAt?: Date;
};

const membershipSelect = {
  id: true,
  teamId: true,
  userId: true,
  accepted: true,
  role: true,
  disableImpersonation: true,
} satisfies Prisma.MembershipSelect;

type MembershipSelectableKeys = keyof typeof membershipSelect;

type MembershipPartialSelect = Partial<Record<MembershipSelectableKeys, boolean>>;

type MembershipDTO = Pick<Membership, MembershipSelectableKeys>;

type MembershipDTOFromSelect<TSelect extends MembershipPartialSelect> = {
  [K in keyof TSelect & keyof MembershipDTO as TSelect[K] extends true ? K : never]: MembershipDTO[K];
};

const teamParentSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
} satisfies Prisma.TeamSelect;

const userSelect = {
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
  timeZone: true,
} satisfies Prisma.UserSelect;

const getWhereForfindAllByUpId = async (upId: string, where?: Prisma.MembershipWhereInput) => {
  const lookupTarget = ProfileRepository.getLookupTarget(upId);
  let prismaWhere;
  if (lookupTarget.type === LookupTarget.Profile) {
    /**
     * TODO: When we add profileId to membership, we lookup by profileId
     * If the profile is movedFromUser, we lookup all memberships without profileId as well.
     */
    let profile;
    if ("uid" in lookupTarget && lookupTarget.uid) {
      profile = await ProfileRepository.findByUid(lookupTarget.uid);
    } else if ("id" in lookupTarget && lookupTarget.id !== undefined) {
      profile = await ProfileRepository.findById(lookupTarget.id);
    } else {
      return [];
    }
    if (!profile) {
      return [];
    }
    const userId = "user" in profile && profile.user ? profile.user.id : null;
    if (!userId) {
      return [];
    }
    prismaWhere = {
      userId,
      ...where,
    };
  } else {
    prismaWhere = {
      userId: lookupTarget.id,
      ...where,
    };
  }

  return prismaWhere;
};

export class MembershipRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async hasMembership({ userId, teamId }: { userId: number; teamId: number }): Promise<boolean> {
    const membership = await this.prismaClient.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
      },
      select: {
        id: true,
      },
    });
    return !!membership;
  }

  async listAcceptedTeamMemberIds({ teamId }: { teamId: number }): Promise<number[]> {
    const memberships =
      (await this.prismaClient.membership.findMany({
        where: {
          teamId,
          accepted: true,
        },
        select: {
          userId: true,
        },
      })) || [];
    const teamMemberIds = memberships.map((membership) => membership.userId);
    return teamMemberIds;
  }

  static async create(data: IMembership) {
    return await prisma.membership.create({
      data: {
        createdAt: new Date(),
        ...data,
      },
    });
  }

  static async findFirstAcceptedMembershipByUserId(userId: number) {
    return await prisma.membership.findFirst({
      where: {
        accepted: true,
        userId,
        team: {
          slug: {
            not: null,
          },
        },
      },
    });
  }

  static async findAcceptedMembershipsByUserIdsInTeam({
    userIds,
    teamId,
  }: {
    userIds: number[];
    teamId: number;
  }) {
    return prisma.membership.findMany({
      where: {
        userId: { in: userIds },
        accepted: true,
        teamId,
      },
    });
  }

  static async createMany(data: IMembership[]) {
    return await prisma.membership.createMany({
      data: data.map((item) => ({
        createdAt: new Date(),
        ...item,
      })),
    });
  }

  /**
   * TODO: Using a specific function for specific tasks so that we don't have to focus on TS magic at the moment. May be try to make it a a generic findAllByProfileId with various options.
   */
  static async findAllByUpIdIncludeTeamWithMembersAndEventTypes(
    { upId }: { upId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const prismaWhere = await getWhereForfindAllByUpId(upId, where);
    if (Array.isArray(prismaWhere)) {
      return prismaWhere;
    }

    log.debug(
      "findAllByUpIdIncludeTeamWithMembersAndEventTypes",
      safeStringify({
        prismaWhere,
      })
    );

    return await prisma.membership.findMany({
      where: prismaWhere,
      include: {
        team: {
          include: {
            members: {
              select: membershipSelect,
            },
            parent: {
              select: teamParentSelect,
            },
            eventTypes: {
              select: {
                ...eventTypeSelect,
                hashedLink: true,
                users: { select: userSelect },
                children: {
                  include: {
                    users: { select: userSelect },
                  },
                },
                hosts: {
                  include: {
                    user: { select: userSelect },
                  },
                },
                team: {
                  select: {
                    id: true,
                    members: {
                      select: {
                        user: {
                          select: {
                            timeZone: true,
                          },
                        },
                      },
                      take: 1,
                    },
                  },
                },
              },
              // As required by getByViewHandler - Make it configurable
              orderBy: [
                {
                  position: "desc",
                },
                {
                  id: "asc",
                },
              ],
            },
          },
        },
      },
    });
  }

  static async findAllByUpIdIncludeMinimalEventTypes(
    { upId }: { upId: string },
    { where, skipEventTypes = false }: { where?: Prisma.MembershipWhereInput; skipEventTypes?: boolean } = {}
  ) {
    const prismaWhere = await getWhereForfindAllByUpId(upId, where);
    if (Array.isArray(prismaWhere)) {
      return prismaWhere;
    }

    log.debug(
      "findAllByUpIdIncludeMinimalEventTypes",
      safeStringify({
        prismaWhere,
      })
    );

    const select = {
      id: true,
      teamId: true,
      userId: true,
      accepted: true,
      role: true,
      disableImpersonation: true,
      team: {
        select: {
          ...teamParentSelect,
          isOrganization: true,
          parent: {
            select: teamParentSelect,
          },
          ...(!skipEventTypes
            ? {
                eventTypes: {
                  select: {
                    ...eventTypeSelect,
                    hashedLink: true,
                    children: { select: { id: true } },
                  },
                  orderBy: [
                    {
                      position: "desc",
                    },
                    {
                      id: "asc",
                    },
                  ],
                },
              }
            : {}),
        },
      },
    } satisfies Prisma.MembershipSelect;

    return await prisma.membership.findMany({
      where: prismaWhere,
      select,
    });
  }

  static async findAllByUpIdIncludeTeam(
    { upId }: { upId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const prismaWhere = await getWhereForfindAllByUpId(upId, where);
    if (Array.isArray(prismaWhere)) {
      return prismaWhere;
    }

    return await prisma.membership.findMany({
      where: prismaWhere,
      include: {
        team: {
          include: {
            parent: {
              select: teamParentSelect,
            },
          },
        },
      },
    });
  }

  static async findUniqueByUserIdAndTeamId({ userId, teamId }: { userId: number; teamId: number }) {
    return await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  async findAllMembershipsByUserIdForBilling({ userId }: { userId: number }) {
    return this.prismaClient.membership.findMany({
      where: { userId },
      select: {
        accepted: true,
        user: {
          select: {
            isPlatformManaged: true,
          },
        },
        team: {
          select: {
            slug: true,
            isOrganization: true,
            isPlatform: true,
            metadata: true,
            platformBilling: {
              select: {
                plan: true,
              },
            },
            parent: {
              select: {
                isOrganization: true,
                slug: true,
                metadata: true,
                isPlatform: true,
              },
            },
          },
        },
      },
    });
  }

  static async findByTeamIdForAvailability({ teamId }: { teamId: number }) {
    const memberships = await prisma.membership.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            credentials: {
              select: credentialForCalendarServiceSelect,
            }, // needed for getUserAvailability
            ...availabilityUserSelect,
          },
        },
      },
    });

    const membershipsWithSelectedCalendars = memberships.map((m) => {
      return {
        ...m,
        user: withSelectedCalendars(m.user),
      };
    });

    return membershipsWithSelectedCalendars;
  }

  static async getAdminOrOwnerMembership(userId: number, teamId: number) {
    return prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        accepted: true,
        role: {
          in: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
      select: {
        id: true,
      },
    });
  }

  static async findAllAcceptedPublishedTeamMemberships(userId: number, tx?: PrismaTransaction) {
    return (tx ?? prisma).membership.findMany({
      where: {
        userId,
        accepted: true,
        team: {
          slug: { not: null },
        },
      },
      select: {
        teamId: true,
      },
    });
  }

  /**
   * Get all team IDs that a user is a member of
   */
  static async findUserTeamIds({ userId }: { userId: number }) {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
      select: {
        teamId: true,
      },
    });

    return memberships.map((membership) => membership.teamId);
  }

  /**
   * Returns members who joined after the given time
   */
  static async findMembershipsCreatedAfterTimeIncludeUser({
    organizationId,
    time,
  }: {
    organizationId: number;
    time: Date;
  }) {
    return prisma.membership.findMany({
      where: {
        teamId: organizationId,
        createdAt: { gt: time },
        accepted: true,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            id: true,
          },
        },
      },
    });
  }

  static async findAllByTeamIds<TSelect extends MembershipPartialSelect = { userId: true }>({
    teamIds,
    select,
  }: {
    teamIds: number[];
    select?: TSelect;
  }): Promise<MembershipDTOFromSelect<TSelect>[]> {
    return (await prisma.membership.findMany({
      where: {
        teamId: { in: teamIds },
        accepted: true,
      },
      // this is explicit, and typed in TSelect default typings
      select: select ?? { userId: true },
    })) as unknown as Promise<MembershipDTOFromSelect<TSelect>[]>;
  }

  static async findAllAcceptedTeamMemberships(userId: number, where?: Prisma.MembershipWhereInput) {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
            accepted: true,
            ...(where ?? {}),
          },
        },
      },
    });
    return teams;
  }

  static async findAllByUserId({
    userId,
    filters,
  }: {
    userId: number;
    filters?: {
      accepted?: boolean;
      roles?: MembershipRole[];
    };
  }) {
    return prisma.membership.findMany({
      where: {
        userId,
        ...(filters?.accepted !== undefined && { accepted: filters.accepted }),
        ...(filters?.roles && { role: { in: filters.roles } }),
      },
      select: {
        teamId: true,
        role: true,
        team: {
          select: {
            id: true,
            parentId: true,
          },
        },
      },
    });
  }

  async findTeamAdminsByTeamId({ teamId }: { teamId: number }) {
    return await this.prismaClient.membership.findMany({
      where: {
        team: {
          id: teamId,
          parentId: {
            not: null,
          },
        },
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
      select: {
        user: {
          select: {
            email: true,
            locale: true,
          },
        },
      },
    });
  }
}
