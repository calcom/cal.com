import { LookupTarget, ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { withSelectedCalendars } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { eventTypeSelect } from "@calcom/lib/server/eventTypeSelect";
import { availabilityUserSelect, type PrismaTransaction, prisma } from "@calcom/prisma";
import type { Membership, Prisma, PrismaClient } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

const log = logger.getSubLogger({
  prefix: ["features/membership/repositories/MembershipRepository"],
});
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

export class PrismaMembershipRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async countByTeamId({ teamId }: { teamId: number }): Promise<number> {
    return this.prismaClient.membership.count({
      where: { teamId },
    });
  }

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

  async hasUserInAnyOfTeams({ userId, teamIds }: { userId: number; teamIds: number[] }): Promise<boolean> {
    if (teamIds.length === 0) return false;
    const membership = await this.prismaClient.membership.findFirst({
      where: {
        userId,
        teamId: { in: teamIds },
        accepted: true,
      },
      select: { id: true },
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

  async create(data: IMembership) {
    return await this.prismaClient.membership.create({
      data: {
        createdAt: new Date(),
        ...data,
      },
    });
  }

  async hasAnyAcceptedMembershipByUserId(userId: number) {
    const membership = await this.prismaClient.membership.findFirst({
      where: {
        accepted: true,
        userId,
        team: {
          slug: {
            not: null,
          },
        },
      },
      select: { id: true },
    });
    return Boolean(membership);
  }

  async findAcceptedMembershipsByUserIdsInTeam({ userIds, teamId }: { userIds: number[]; teamId: number }) {
    return this.prismaClient.membership.findMany({
      where: {
        userId: { in: userIds },
        accepted: true,
        teamId,
      },
    });
  }

  async createMany(data: IMembership[]) {
    return await this.prismaClient.membership.createMany({
      data: data.map((item) => ({
        createdAt: new Date(),
        ...item,
      })),
    });
  }

  /**
   * TODO: Using a specific function for specific tasks so that we don't have to focus on TS magic at the moment. May be try to make it a a generic findAllByProfileId with various options.
   */
  async findAllByUpIdIncludeTeamWithMembersAndEventTypes(
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

    return await this.prismaClient.membership.findMany({
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

  async findAllByUpIdIncludeMinimalEventTypes(
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

    return await this.prismaClient.membership.findMany({
      where: prismaWhere,
      select,
    });
  }

  async findAllByUpIdIncludeTeam(
    { upId }: { upId: string },
    { where }: { where?: Prisma.MembershipWhereInput } = {}
  ) {
    const prismaWhere = await getWhereForfindAllByUpId(upId, where);
    if (Array.isArray(prismaWhere)) {
      return prismaWhere;
    }

    return await this.prismaClient.membership.findMany({
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

  async findUniqueByUserIdAndTeamId({ userId, teamId }: { userId: number; teamId: number }) {
    return await this.prismaClient.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });
  }

  async findRoleByUserIdAndTeamId({ userId, teamId }: { userId: number; teamId: number }) {
    return await this.prismaClient.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      select: {
        role: true,
      },
    });
  }

  async findMembershipsWithUserByTeamId({ teamId }: { teamId: number }) {
    return this.prismaClient.membership.findMany({
      where: { teamId },
      select: {
        role: true,
        accepted: true,
        user: {
          select: {
            name: true,
            avatarUrl: true,
            username: true,
            id: true,
            email: true,
            locale: true,
            defaultScheduleId: true,
            isPlatformManaged: true,
            timeZone: true,
            eventTypes: {
              select: {
                slug: true,
              },
            },
          },
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
            organizationBilling: {
              select: {
                planName: true,
              },
            },
            parent: {
              select: {
                isOrganization: true,
                slug: true,
                metadata: true,
                isPlatform: true,
                organizationBilling: {
                  select: {
                    planName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByTeamIdForAvailability({ teamId }: { teamId: number }) {
    const memberships = await this.prismaClient.membership.findMany({
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

  async getAdminOrOwnerMembership(userId: number, teamId: number) {
    return this.prismaClient.membership.findFirst({
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

  async findAllAcceptedPublishedTeamMemberships(userId: number, tx?: PrismaTransaction) {
    return (tx ?? this.prismaClient).membership.findMany({
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
  async findUserTeamIds({ userId }: { userId: number }) {
    const memberships = await this.prismaClient.membership.findMany({
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
  async findMembershipsCreatedAfterTimeIncludeUser({
    organizationId,
    time,
  }: {
    organizationId: number;
    time: Date;
  }) {
    return this.prismaClient.membership.findMany({
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

  async findAllByTeamIds<TSelect extends MembershipPartialSelect = { userId: true }>({
    teamIds,
    select,
  }: {
    teamIds: number[];
    select?: TSelect;
  }): Promise<MembershipDTOFromSelect<TSelect>[]> {
    return (await this.prismaClient.membership.findMany({
      where: {
        teamId: { in: teamIds },
        accepted: true,
      },
      // this is explicit, and typed in TSelect default typings
      select: select ?? { userId: true },
    })) as unknown as Promise<MembershipDTOFromSelect<TSelect>[]>;
  }

  async findAllAcceptedTeamMemberships(userId: number, where?: Prisma.MembershipWhereInput) {
    const teams = await this.prismaClient.team.findMany({
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

  async findAllByUserId({
    userId,
    filters,
  }: {
    userId: number;
    filters?: {
      accepted?: boolean;
      roles?: MembershipRole[];
    };
  }) {
    return this.prismaClient.membership.findMany({
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
            isOrganization: true,
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

  async areAllEmailsAcceptedMembers({
    emails,
    teamId,
  }: {
    emails: string[];
    teamId: number;
  }): Promise<boolean> {
    if (emails.length === 0) return true;

    const members = await this.prismaClient.membership.findMany({
      where: {
        teamId,
        accepted: true,
        user: { email: { in: emails } },
      },
      select: { user: { select: { email: true } } },
    });

    const memberEmails = new Set(members.map((m) => m.user.email.toLowerCase()));
    return emails.every((e) => memberEmails.has(e.toLowerCase()));
  }

  // Two indexed lookups instead of JOIN with ILIKE (which bypasses index)
  async hasAcceptedMembershipByEmail({ email, teamId }: { email: string; teamId: number }): Promise<boolean> {
    const user = await this.prismaClient.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (!user) return false;

    const membership = await this.prismaClient.membership.findUnique({
      where: {
        userId_teamId: { userId: user.id, teamId },
      },
      select: { accepted: true },
    });

    return membership?.accepted ?? false;
  }

  async hasPendingInviteByUserId({ userId }: { userId: number }): Promise<boolean> {
    const pendingInvite = await this.prismaClient.membership.findFirst({
      where: {
        userId,
        accepted: false,
      },
      select: {
        id: true,
      },
    });
    return !!pendingInvite;
  }

  async searchMembers({
    teamId,
    search,
    cursor,
    limit,
    memberUserIds,
  }: {
    teamId: number;
    search?: string | null;
    cursor?: number | null;
    limit: number;
    memberUserIds?: number[] | null;
  }) {
    const where: Record<string, unknown> = {
      teamId,
      accepted: true,
    };

    const userFilter: Record<string, unknown> = {};

    if (search) {
      userFilter.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (memberUserIds !== undefined && memberUserIds !== null) {
      userFilter.id = cursor ? { in: memberUserIds, gt: cursor } : { in: memberUserIds };
    } else if (cursor) {
      userFilter.id = { gt: cursor };
    }

    if (Object.keys(userFilter).length > 0) {
      where.user = userFilter;
    }

    const memberships = await this.prismaClient.membership.findMany({
      where,
      take: limit + 1,
      orderBy: { user: { id: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            username: true,
            defaultScheduleId: true,
          },
        },
        role: true,
      },
    });

    const hasMore = memberships.length > limit;
    const items = hasMore ? memberships.slice(0, limit) : memberships;
    const nextCursor = hasMore ? items[items.length - 1].user.id : undefined;

    return { memberships: items, nextCursor, hasMore };
  }

  async findAcceptedMembersWithUserProfile({ teamId }: { teamId: number }) {
    return this.prismaClient.membership.findMany({
      where: {
        teamId,
        accepted: true,
      },
      orderBy: { user: { id: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findAllAcceptedMembers({ teamId }: { teamId: number }) {
    return this.prismaClient.membership.findMany({
      where: { teamId, accepted: true },
      orderBy: { user: { id: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            username: true,
            defaultScheduleId: true,
          },
        },
        role: true,
      },
    });
  }

  /**
   * Checks if a user has any team membership (pending or accepted).
   * Used during onboarding to detect users who signed up via invite token,
   * where the membership is auto-accepted.
   */
  async hasAnyTeamMembershipByUserId({ userId }: { userId: number }): Promise<boolean> {
    const membership = await this.prismaClient.membership.findFirst({
      where: {
        userId,
        team: {
          isOrganization: false,
        },
      },
      select: {
        id: true,
      },
    });
    return !!membership;
  }

  /**
   * Find team IDs where user has accepted membership in non-private, non-organization teams
   */
  async findAcceptedNonPrivateTeamIdsByUserId({ userId }: { userId: number }): Promise<number[]> {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
        accepted: true,
        team: {
          isPrivate: false,
          isOrganization: false,
        },
      },
      select: {
        teamId: true,
      },
    });
    return memberships.map((m) => m.teamId);
  }

  /**
   * Find distinct members from given teams for dynamic link creation.
   * Only includes users who have allowDynamicBooking enabled.
   */
  async findDistinctMembersForDynamicLink({
    teamIds,
    cursor,
    searchTerm,
    limit,
  }: {
    teamIds: number[];
    cursor?: number | null;
    searchTerm?: string;
    limit: number;
  }) {
    const where: Prisma.MembershipWhereInput = {
      teamId: { in: teamIds },
      accepted: true,
      user: {
        username: { not: null },
        isPlatformManaged: false,
        allowDynamicBooking: true,
        ...(cursor && { id: { gt: cursor } }),
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
          ],
        }),
      },
    };

    return this.prismaClient.membership.findMany({
      where,
      select: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      distinct: ["userId"],
      take: limit,
      orderBy: {
        user: {
          id: "asc",
        },
      },
    });
  }

  async searchByTeamIdAndEmailPrefix({
    teamId,
    emailPrefix,
    cursor,
    limit,
  }: {
    teamId: number;
    emailPrefix: string;
    cursor?: number | null;
    limit: number;
  }) {
    return this.prismaClient.membership.findMany({
      where: {
        teamId,
        user: {
          email: { contains: emailPrefix, mode: "insensitive" },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
      },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { user: { id: "asc" } },
      take: limit + 1,
    });
  }

  async findByUserIdAndTeamIdIncludeUser({ userId, teamId }: { userId: number; teamId: number }) {
    return this.prismaClient.membership.findUnique({
      where: { userId_teamId: { userId, teamId } },
      select: {
        role: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async findOwnersByTeamIdIncludeUser({ teamId }: { teamId: number }) {
    return this.prismaClient.membership.findMany({
      where: { teamId, role: MembershipRole.OWNER },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async updateRole({ userId, teamId, role }: { userId: number; teamId: number; role: MembershipRole }) {
    return this.prismaClient.membership.update({
      where: { userId_teamId: { userId, teamId } },
      data: { role },
    });
  }

  async deleteByUserIdAndTeamId({ userId, teamId }: { userId: number; teamId: number }) {
    return this.prismaClient.membership.delete({
      where: { userId_teamId: { userId, teamId } },
    });
  }

  async transferOwnership({
    teamId,
    newOwnerUserId,
    previousOwnerUserId,
    previousOwnerAction,
  }: {
    teamId: number;
    newOwnerUserId: number;
    previousOwnerUserId: number;
    previousOwnerAction: "ADMIN" | "MEMBER" | "REMOVE";
  }) {
    await this.prismaClient.$transaction(async (tx) => {
      await tx.membership.update({
        where: { userId_teamId: { userId: newOwnerUserId, teamId } },
        data: { role: MembershipRole.OWNER },
      });

      if (previousOwnerAction === "REMOVE") {
        await tx.membership.delete({
          where: { userId_teamId: { userId: previousOwnerUserId, teamId } },
        });
      } else {
        const newRole = previousOwnerAction === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER;
        await tx.membership.update({
          where: { userId_teamId: { userId: previousOwnerUserId, teamId } },
          data: { role: newRole },
        });
      }
    });
  }
}
