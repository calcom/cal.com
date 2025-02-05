import { createHash } from "crypto";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { availabilityUserSelect } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { User as UserType } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { UpId, UserProfile } from "@calcom/types/UserProfile";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "../../availability";
import slugify from "../../slugify";
import { ProfileRepository } from "./profile";
import { getParsedTeam } from "./teamUtils";

export type UserAdminTeams = number[];

const log = logger.getSubLogger({ prefix: ["[repository/user]"] });

export const ORGANIZATION_ID_UNKNOWN = "ORGANIZATION_ID_UNKNOWN";

const teamSelect = Prisma.validator<Prisma.TeamSelect>()({
  id: true,
  name: true,
  slug: true,
  metadata: true,
  logoUrl: true,
  organizationSettings: true,
  isOrganization: true,
  isPlatform: true,
});

const userSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  name: true,
  email: true,
  emailVerified: true,
  bio: true,
  avatarUrl: true,
  timeZone: true,
  startTime: true,
  endTime: true,
  weekStart: true,
  bufferTime: true,
  hideBranding: true,
  theme: true,
  createdDate: true,
  trialEndsAt: true,
  completedOnboarding: true,
  locale: true,
  timeFormat: true,
  twoFactorSecret: true,
  twoFactorEnabled: true,
  backupCodes: true,
  identityProviderId: true,
  invitedTo: true,
  brandColor: true,
  darkBrandColor: true,
  allowDynamicBooking: true,
  allowSEOIndexing: true,
  receiveMonthlyDigestEmail: true,
  verified: true,
  disableImpersonation: true,
  locked: true,
  movedToProfileId: true,
  metadata: true,
  isPlatformManaged: true,
  lastActiveAt: true,
  identityProvider: true,
  teams: true,
});

export type UserWithLegacySelectedCalendars<TCalendar, TUser> = TUser & {
  selectedCalendars: TCalendar[];
};

type UserWithSelectedCalendars<TCalendar, TUser> = Omit<TUser, "selectedCalendars"> & {
  allSelectedCalendars: TCalendar[];
  userLevelSelectedCalendars: TCalendar[];
};

export function withSelectedCalendars<
  TCalendar extends {
    eventTypeId: number | null;
  },
  TUser extends {
    selectedCalendars: TCalendar[];
  }
>(user: UserWithLegacySelectedCalendars<TCalendar, TUser>): UserWithSelectedCalendars<TCalendar, TUser> {
  // We are renaming selectedCalendars to allSelectedCalendars to make it clear that it contains all the calendars including eventType calendars
  const { selectedCalendars, ...restUser } = user;
  return {
    ...restUser,
    allSelectedCalendars: selectedCalendars,
    userLevelSelectedCalendars: selectedCalendars.filter((calendar) => !calendar.eventTypeId),
  };
}

export class UserRepository {
  static async findTeamsByUserId({ userId }: { userId: UserType["id"] }) {
    const teamMemberships = await prisma.membership.findMany({
      where: {
        userId: userId,
      },
      include: {
        team: {
          select: teamSelect,
        },
      },
    });

    const acceptedTeamMemberships = teamMemberships.filter((membership) => membership.accepted);
    const pendingTeamMemberships = teamMemberships.filter((membership) => !membership.accepted);

    return {
      teams: acceptedTeamMemberships.map((membership) => membership.team),
      memberships: teamMemberships,
      acceptedTeamMemberships,
      pendingTeamMemberships,
    };
  }

  static async findOrganizations({ userId }: { userId: UserType["id"] }) {
    const { acceptedTeamMemberships } = await UserRepository.findTeamsByUserId({
      userId,
    });

    const acceptedOrgMemberships = acceptedTeamMemberships.filter(
      (membership) => membership.team.isOrganization
    );

    const organizations = acceptedOrgMemberships.map((membership) => membership.team);

    return {
      organizations,
    };
  }

  /**
   * It is aware of the fact that a user can be part of multiple organizations.
   */
  static async findUsersByUsername({
    orgSlug,
    usernameList,
  }: {
    orgSlug: string | null;
    usernameList: string[];
  }) {
    const { where, profiles } = await UserRepository._getWhereClauseForFindingUsersByUsername({
      orgSlug,
      usernameList,
    });
    log.info("findUsersByUsername", safeStringify({ where, profiles }));

    return (
      await prisma.user.findMany({
        select: userSelect,
        where,
      })
    ).map((user) => {
      log.info("findUsersByUsername", safeStringify({ user }));
      // User isn't part of any organization
      if (!profiles) {
        return {
          ...user,
          profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
        };
      }
      const profile = profiles.find((profile) => profile.user.id === user.id) ?? null;
      if (!profile) {
        log.error("Profile not found for user", safeStringify({ user, profiles }));
        // Profile must be there because profile itself was used to retrieve the user
        throw new Error("Profile couldn't be found");
      }
      const { user: _1, ...profileWithoutUser } = profile;
      return {
        ...user,
        profile: profileWithoutUser,
      };
    });
  }

  static async _getWhereClauseForFindingUsersByUsername({
    orgSlug,
    usernameList,
  }: {
    orgSlug: string | null;
    usernameList: string[];
  }) {
    // Lookup in profiles because that's where the organization usernames exist
    const profiles = orgSlug
      ? (
          await ProfileRepository.findManyByOrgSlugOrRequestedSlug({
            orgSlug: orgSlug,
            usernames: usernameList,
          })
        ).map((profile) => ({
          ...profile,
          organization: getParsedTeam(profile.organization),
        }))
      : null;
    const where =
      profiles && profiles.length > 0
        ? {
            // Get UserIds from profiles
            id: {
              in: profiles.map((profile) => profile.user.id),
            },
          }
        : {
            username: {
              in: usernameList,
            },
            ...(orgSlug
              ? {
                  organization: whereClauseForOrgWithSlugOrRequestedSlug(orgSlug),
                }
              : {
                  organization: null,
                }),
          };
    return { where, profiles };
  }

  static async findByEmail({ email }: { email: string }) {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      select: userSelect,
    });
    return user;
  }

  static async findByEmailAndIncludeProfilesAndPassword({ email }: { email: string }) {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        locked: true,
        role: true,
        id: true,
        username: true,
        name: true,
        email: true,
        metadata: true,
        identityProvider: true,
        password: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
        locale: true,
        teams: {
          include: {
            team: {
              select: teamSelect,
            },
          },
        },
        createdDate: true,
      },
    });

    if (!user) {
      return null;
    }

    const allProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(user);
    return {
      ...user,
      allProfiles,
    };
  }

  static async findById({ id }: { id: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: userSelect,
    });

    if (!user) {
      return null;
    }
    return {
      ...user,
      metadata: userMetadata.parse(user.metadata),
    };
  }

  static async findByIds({ ids }: { ids: number[] }) {
    return prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      select: userSelect,
    });
  }

  static async findByIdOrThrow({ id }: { id: number }) {
    const user = await UserRepository.findById({ id });
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }

  static async findManyByOrganization({ organizationId }: { organizationId: number }) {
    const profiles = await ProfileRepository.findManyForOrg({ organizationId });
    return profiles.map((profile) => profile.user);
  }

  static isAMemberOfOrganization({
    user,
    organizationId,
  }: {
    user: { profiles: { organizationId: number }[] };
    organizationId: number;
  }) {
    return user.profiles.some((profile) => profile.organizationId === organizationId);
  }

  static async findIfAMemberOfSomeOrganization({ user }: { user: { id: number } }) {
    return !!(
      await ProfileRepository.findManyForUser({
        id: user.id,
      })
    ).length;
  }

  static isMigratedToOrganization({
    user,
  }: {
    user: {
      metadata?: {
        migratedToOrgFrom?: unknown;
      } | null;
    };
  }) {
    return !!user.metadata?.migratedToOrgFrom;
  }

  static async isMovedToAProfile({ user }: { user: Pick<UserType, "movedToProfileId"> }) {
    return !!user.movedToProfileId;
  }

  static async enrichUserWithTheProfile<T extends { username: string | null; id: number }>({
    user,
    upId,
  }: {
    user: T;
    upId: UpId;
  }) {
    log.debug("enrichUserWithTheProfile", safeStringify({ user, upId }));
    const profile = await ProfileRepository.findByUpId(upId);
    if (!profile) {
      return {
        ...user,
        profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
      };
    }
    return {
      ...user,
      profile,
    };
  }

  /**
   * Use this method instead of `enrichUserWithTheProfile` if you don't directly have the profileId.
   * It can happen in following cases:
   * 1. While dealing with a User that hasn't been added to any organization yet and thus have no Profile entries.
   * 2. While dealing with a User that has been moved to a Profile i.e. he was invited to an organization when he was an existing user.
   * 3. We haven't added profileId to all the entities, so they aren't aware of which profile they belong to. So, we still mostly use this function to enrich the user with its profile.
   */
  static async enrichUserWithItsProfile<T extends { id: number; username: string | null }>({
    user,
  }: {
    user: T;
  }): Promise<
    T & {
      nonProfileUsername: string | null;
      profile: UserProfile;
    }
  > {
    const profiles = await ProfileRepository.findManyForUser({ id: user.id });
    if (profiles.length) {
      const profile = profiles[0];
      // platform org user doesn't need org profile
      if (profile?.organization?.isPlatform) {
        return {
          ...user,
          nonProfileUsername: user.username,
          profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
        };
      }

      return {
        ...user,
        username: profile.username,
        nonProfileUsername: user.username,
        profile,
      };
    }

    // If no organization profile exists, use the personal profile so that the returned user is normalized to have a profile always
    return {
      ...user,
      nonProfileUsername: user.username,
      profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
    };
  }

  static async enrichUsersWithTheirProfiles<T extends { id: number; username: string | null }>(
    users: T[]
  ): Promise<
    Array<
      T & {
        nonProfileUsername: string | null;
        profile: UserProfile;
      }
    >
  > {
    if (users.length === 0) return [];

    const userIds = users.map((user) => user.id);
    const profiles = await ProfileRepository.findManyForUsers(userIds);

    // Create a Map for faster lookups, preserving arrays of profiles per user
    const profileMap = new Map<number, UserProfile[]>();
    profiles.forEach((profile) => {
      if (!profileMap.has(profile.userId)) {
        profileMap.set(profile.userId, []);
      }
      profileMap.get(profile.userId)!.push(profile);
    });

    // Precompute personal profiles for all users
    const personalProfileMap = new Map<number, UserProfile>();
    users.forEach((user) => {
      personalProfileMap.set(user.id, ProfileRepository.buildPersonalProfileFromUser({ user }));
    });

    return users.map((user) => {
      const userProfiles = profileMap.get(user.id) || [];
      if (userProfiles.length > 0) {
        const profile = userProfiles[0];
        if (profile?.organization?.isPlatform) {
          return {
            ...user,
            nonProfileUsername: user.username,
            profile: personalProfileMap.get(user.id)!,
          };
        }

        return {
          ...user,
          username: profile.username,
          nonProfileUsername: user.username,
          profile,
        };
      }

      // If no organization profile exists, use the precomputed personal profile
      return {
        ...user,
        nonProfileUsername: user.username,
        profile: personalProfileMap.get(user.id)!,
      };
    });
  }

  static enrichUserWithItsProfileBuiltFromUser<T extends { id: number; username: string | null }>({
    user,
  }: {
    user: T;
  }): T & {
    nonProfileUsername: string | null;
    profile: UserProfile;
  } {
    // If no organization profile exists, use the personal profile so that the returned user is normalized to have a profile always
    return {
      ...user,
      nonProfileUsername: user.username,
      profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
    };
  }

  static async enrichEntityWithProfile<
    T extends
      | {
          profile: {
            id: number;
            username: string | null;
            organizationId: number | null;
            organization?: {
              id: number;
              name: string;
              calVideoLogo?: string | null;
              bannerUrl: string | null;
              slug: string | null;
              metadata: Prisma.JsonValue;
            };
          };
        }
      | {
          user: {
            username: string | null;
            id: number;
          };
        }
  >(entity: T) {
    if ("profile" in entity) {
      const { profile, ...entityWithoutProfile } = entity;
      const { organization, ...profileWithoutOrganization } = profile || {};
      const parsedOrg = organization ? getParsedTeam(organization) : null;

      const ret = {
        ...entityWithoutProfile,
        profile: {
          ...profileWithoutOrganization,
          ...(parsedOrg
            ? {
                organization: parsedOrg,
              }
            : {
                organization: null,
              }),
        },
      };
      return ret;
    } else {
      const profiles = await ProfileRepository.findManyForUser(entity.user);
      if (!profiles.length) {
        return {
          ...entity,
          profile: ProfileRepository.buildPersonalProfileFromUser({ user: entity.user }),
        };
      } else {
        return {
          ...entity,
          profile: profiles[0],
        };
      }
    }
  }

  static async updateWhereId({
    whereId,
    data,
  }: {
    whereId: number;
    data: {
      movedToProfileId?: number | null;
    };
  }) {
    return prisma.user.update({
      where: {
        id: whereId,
      },
      data: {
        movedToProfile: data.movedToProfileId
          ? {
              connect: {
                id: data.movedToProfileId,
              },
            }
          : undefined,
      },
    });
  }

  static async create({
    email,
    username,
    organizationId,
    creationSource,
  }: {
    email: string;
    username: string;
    organizationId: number | null;
    creationSource: CreationSource;
  }) {
    console.log("create user", { email, username, organizationId });
    const password = createHash("md5").update(`${email}${process.env.CALENDSO_ENCRYPTION_KEY}`).digest("hex");
    const hashedPassword = await hashPassword(password);
    const t = await getTranslation("en", "common");
    const availability = getAvailabilityFromSchedule(DEFAULT_SCHEDULE);

    return await prisma.user.create({
      data: {
        username: slugify(username),
        email: email,
        password: { create: { hash: hashedPassword } },
        // Default schedule
        schedules: {
          create: {
            name: t("default_schedule_name"),
            availability: {
              createMany: {
                data: availability.map((schedule) => ({
                  days: schedule.days,
                  startTime: schedule.startTime,
                  endTime: schedule.endTime,
                })),
              },
            },
          },
        },
        organizationId: organizationId,
        profiles: organizationId
          ? {
              create: {
                username: slugify(username),
                organizationId: organizationId,
                uid: ProfileRepository.generateProfileUid(),
              },
            }
          : undefined,
        creationSource,
      },
    });
  }
  static async getUserAdminTeams(userId: number) {
    return prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        avatarUrl: true,
        name: true,
        username: true,
        teams: {
          where: {
            accepted: true,
            OR: [
              {
                role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
              },
              {
                team: {
                  parent: {
                    members: {
                      some: {
                        id: userId,
                        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
                      },
                    },
                  },
                },
              },
            ],
          },
          select: {
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                isOrganization: true,
                parent: {
                  select: {
                    logoUrl: true,
                    name: true,
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
  static async isAdminOfTeamOrParentOrg({ userId, teamId }: { userId: number; teamId: number }) {
    const membershipQuery = {
      members: {
        some: {
          userId,
          role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        },
      },
    };
    const teams = await prisma.team.findMany({
      where: {
        id: teamId,
        OR: [
          membershipQuery,
          {
            parent: { ...membershipQuery },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    return !!teams.length;
  }
  static async isAdminOrOwnerOfTeam({ userId, teamId }: { userId: number; teamId: number }) {
    const isAdminOrOwnerOfTeam = await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        role: { in: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        accepted: true,
      },
      select: {
        id: true,
      },
    });
    return !!isAdminOrOwnerOfTeam;
  }
  static async getTimeZoneAndDefaultScheduleId({ userId }: { userId: number }) {
    return await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        timeZone: true,
        defaultScheduleId: true,
      },
    });
  }

  static async adminFindById(userId: number) {
    return await prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
  }

  static async findUserTeams({ id }: { id: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        completedOnboarding: true,
        teams: {
          select: {
            accepted: true,
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }
    return user;
  }

  static async updateAvatar({ id, avatarUrl }: { id: number; avatarUrl: string }) {
    // Using updateMany here since if the user already has a profile it would throw an error
    // because no records were found to update the profile picture
    await prisma.user.updateMany({
      where: {
        id,
        avatarUrl: {
          equals: null,
        },
      },
      data: {
        avatarUrl,
      },
    });
  }
  static async findUserWithCredentials({ id }: { id: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
        timeZone: true,
        id: true,
        selectedCalendars: true,
      },
    });

    if (!user) {
      return null;
    }

    return withSelectedCalendars(user);
  }

  static async findForAvailabilityCheck({ where }: { where: Prisma.UserWhereInput }) {
    const user = await prisma.user.findFirst({
      where,
      select: {
        ...availabilityUserSelect,
        selectedCalendars: true,
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
      },
    });

    if (!user) {
      return null;
    }

    const userWithSelectedCalendars = withSelectedCalendars(user);
    return userWithSelectedCalendars;
  }

  static async findUnlockedUserForSession({ userId }: { userId: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        // Locked users can't login
        locked: false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        emailVerified: true,
        bio: true,
        avatarUrl: true,
        timeZone: true,
        weekStart: true,
        startTime: true,
        endTime: true,
        defaultScheduleId: true,
        bufferTime: true,
        theme: true,
        appTheme: true,
        createdDate: true,
        hideBranding: true,
        twoFactorEnabled: true,
        disableImpersonation: true,
        identityProvider: true,
        identityProviderId: true,
        brandColor: true,
        darkBrandColor: true,
        movedToProfileId: true,
        selectedCalendars: {
          select: {
            eventTypeId: true,
            externalId: true,
            integration: true,
          },
        },
        completedOnboarding: true,
        destinationCalendar: true,
        locale: true,
        timeFormat: true,
        trialEndsAt: true,
        metadata: true,
        role: true,
        allowDynamicBooking: true,
        allowSEOIndexing: true,
        receiveMonthlyDigestEmail: true,
        profiles: true,
      },
    });

    if (!user) {
      return null;
    }

    return withSelectedCalendars(user);
  }

  static async getUserStats({ userId }: { userId: number }) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        _count: {
          select: {
            bookings: true,
            // We only need user level selected calendars
            selectedCalendars: {
              where: {
                eventTypeId: null,
              },
            },
            teams: true,
            eventTypes: true,
          },
        },
        teams: {
          select: {
            team: {
              select: {
                eventTypes: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const { _count, ...restUser } = user;
    const { selectedCalendars, ...restCount } = _count;
    return {
      ...restUser,
      _count: {
        ...restCount,
        userLevelSelectedCalendars: selectedCalendars,
      },
    };
  }

  static async findManyByIdsIncludeDestinationAndSelectedCalendars({ ids }: { ids: number[] }) {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      include: {
        selectedCalendars: true,
        destinationCalendar: true,
      },
    });
    return users.map(withSelectedCalendars);
  }
}
