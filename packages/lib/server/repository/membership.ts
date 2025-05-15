import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import slugify from "@calcom/lib/slugify";
import { availabilityUserSelect, prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { safeStringify } from "../../safeStringify";
import { eventTypeSelect } from "../eventTypeSelect";
import { LookupTarget, ProfileRepository } from "./profile";
import { withSelectedCalendars } from "./user";

const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

const log = logger.getSubLogger({ prefix: ["repository/membership"] });
type IMembership = {
  teamId: number;
  userId: number;
  accepted: boolean;
  role: MembershipRole;
  createdAt?: Date;
};

const membershipSelect = Prisma.validator<Prisma.MembershipSelect>()({
  id: true,
  teamId: true,
  userId: true,
  accepted: true,
  role: true,
  disableImpersonation: true,
});

const teamParentSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  parentId: true,
  metadata: true,
});

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
});

const getWhereForfindAllByUpId = async (upId: string, where?: Prisma.MembershipWhereInput) => {
  const lookupTarget = ProfileRepository.getLookupTarget(upId);
  let prismaWhere;
  if (lookupTarget.type === LookupTarget.Profile) {
    /**
     * TODO: When we add profileId to membership, we lookup by profileId
     * If the profile is movedFromUser, we lookup all memberships without profileId as well.
     */
    const profile = await ProfileRepository.findById(lookupTarget.id);
    if (!profile) {
      return [];
    }
    prismaWhere = {
      userId: profile.user.id,
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
  static async create(data: IMembership) {
    return await prisma.membership.create({
      data: {
        createdAt: new Date(),
        ...data,
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

    const select = Prisma.validator<Prisma.MembershipSelect>()({
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
    });

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

  static async findFirstByUserIdAndTeamId({ userId, teamId }: { userId: number; teamId: number }) {
    return await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
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

  static async findMembershipsForBothOrgAndTeam({ orgId, teamId }: { orgId: number; teamId: number }) {
    const memberships = await prisma.membership.findMany({
      where: {
        teamId: {
          in: [orgId, teamId],
        },
      },
    });

    type Membership = (typeof memberships)[number];

    const { teamMemberships, orgMemberships } = memberships.reduce(
      (acc, membership) => {
        if (membership.teamId === teamId) {
          acc.teamMemberships.push(membership);
        } else if (membership.teamId === orgId) {
          acc.orgMemberships.push(membership);
        }
        return acc;
      },
      { teamMemberships: [] as Membership[], orgMemberships: [] as Membership[] }
    );

    return {
      teamMemberships,
      orgMemberships,
    };
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
  static async findAllAcceptedMemberships(userId: number) {
    return prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
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

  static async createBulkMemberships({
    teamId,
    invitees,
    parentId,
    accepted,
  }: {
    teamId: number;
    invitees: Array<{
      id: number;
      newRole: MembershipRole;
      needToCreateOrgMembership: boolean | null;
    }>;
    parentId: number | null;
    accepted: boolean;
  }): Promise<void> {
    log.debug("Creating memberships for", safeStringify({ teamId, invitees, parentId, accepted }));

    try {
      const membershipsToCreate = invitees.flatMap((invitee) => {
        const data = [];
        const createdAt = new Date();

        data.push({
          createdAt,
          teamId,
          userId: invitee.id,
          accepted,
          role: invitee.newRole,
        });

        if (parentId && invitee.needToCreateOrgMembership) {
          data.push({
            createdAt,
            accepted,
            teamId: parentId,
            userId: invitee.id,
            role: MembershipRole.MEMBER,
          });
        }

        return data;
      });

      await prisma.membership.createMany({
        data: membershipsToCreate,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        logger.error("Failed to create memberships", { teamId });
        throw new Error(`Failed to create memberships for team ${teamId}`);
      }
      throw e;
    }
  }

  static async createNewUsersConnectToOrgIfExists({
    invitations,
    isOrg,
    teamId,
    parentId,
    autoAcceptEmailDomain,
    orgConnectInfoByUsernameOrEmail,
    isPlatformManaged,
    timeFormat,
    weekStart,
    timeZone,
    language,
    creationSource,
  }: {
    invitations: Array<{
      usernameOrEmail: string;
      role: MembershipRole;
    }>;
    isOrg: boolean;
    teamId: number;
    parentId?: number | null;
    autoAcceptEmailDomain: string | null;
    orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
    isPlatformManaged?: boolean;
    timeFormat?: number;
    weekStart?: string;
    timeZone?: string;
    language: string;
    creationSource: CreationSource;
  }) {
    // fail if we have invalid emails
    invitations.forEach((invitation) => {
      if (!isEmail(invitation.usernameOrEmail)) {
        throw new Error(`Invalid email: ${invitation.usernameOrEmail}`);
      }
    });

    const t = await getTranslation(language ?? "en", "common");
    const defaultAvailability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

    return await prisma.$transaction(async (tx) => {
      const createdUsers = [];
      for (let index = 0; index < invitations.length; index++) {
        const invitation = invitations[index];
        const { orgId, autoAccept } = orgConnectInfoByUsernameOrEmail[invitation.usernameOrEmail];
        const [emailUser, emailDomain] = invitation.usernameOrEmail.split("@");
        const [domainName, TLD] = emailDomain.split(".");

        // An org member can't change username during signup, so we set the username
        const orgMemberUsername =
          emailDomain === autoAcceptEmailDomain
            ? slugify(emailUser)
            : slugify(`${emailUser}-${domainName}${isPlatformManaged ? `-${TLD}` : ""}`);

        // As a regular team member is allowed to change username during signup, we don't set any username for him
        const regularTeamMemberUsername = null;

        const isBecomingAnOrgMember = parentId || isOrg;

        const createdUser = await tx.user.create({
          data: {
            username: isBecomingAnOrgMember ? orgMemberUsername : regularTeamMemberUsername,
            email: invitation.usernameOrEmail,
            verified: true,
            invitedTo: teamId,
            isPlatformManaged: !!isPlatformManaged,
            timeFormat,
            weekStart,
            timeZone,
            creationSource,
            organizationId: orgId || null,
            ...(orgId
              ? {
                  profiles: {
                    createMany: {
                      data: [
                        {
                          uid: ProfileRepository.generateProfileUid(),
                          username: orgMemberUsername,
                          organizationId: orgId,
                        },
                      ],
                    },
                  },
                }
              : null),
            teams: {
              create: {
                teamId: teamId,
                role: invitation.role,
                accepted: autoAccept,
              },
            },
            ...(!isPlatformManaged
              ? {
                  schedules: {
                    create: {
                      name: t("default_schedule_name"),
                      availability: {
                        createMany: {
                          data: defaultAvailability.map((schedule) => ({
                            days: schedule.days,
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                          })),
                        },
                      },
                    },
                  },
                }
              : {}),
          },
        });

        // We also need to create the membership in the parent org if it exists
        if (parentId) {
          await tx.membership.create({
            data: {
              createdAt: new Date(),
              teamId: parentId,
              userId: createdUser.id,
              role: MembershipRole.MEMBER,
              accepted: autoAccept,
            },
          });
        }
        createdUsers.push(createdUser);
      }
      return createdUsers;
    });
  }
}
