import { v4 as uuidv4 } from "uuid";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { DATABASE_CHUNK_SIZE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getParsedTeam } from "@calcom/lib/server/repository/teamUtils";
import prisma from "@calcom/prisma";
import type { User as PrismaUser } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import type { Team } from "@calcom/prisma/client";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { UpId, UserAsPersonalProfile, UserProfile } from "@calcom/types/UserProfile";

const userSelect = {
  name: true,
  avatarUrl: true,
  username: true,
  id: true,
  email: true,
  locale: true,
  defaultScheduleId: true,
  startTime: true,
  endTime: true,
  bufferTime: true,
  isPlatformManaged: true,
} satisfies Prisma.UserSelect;

const membershipSelect = {
  id: true,
  teamId: true,
  userId: true,
  accepted: true,
  role: true,
  disableImpersonation: true,
} satisfies Prisma.MembershipSelect;

const log = logger.getSubLogger({ prefix: ["repository/profile"] });
const organizationSettingsSelect = {
  allowSEOIndexing: true,
  orgProfileRedirectsToVerifiedDomain: true,
} satisfies Prisma.OrganizationSettingsSelect;
const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  metadata: true,
  logoUrl: true,
  bannerUrl: true,
  isPlatform: true,
  hideBranding: true,
};
const organizationWithSettingsSelect = {
  ...organizationSelect,
  organizationSettings: {
    select: organizationSettingsSelect,
  },
};

export enum LookupTarget {
  User,
  Profile,
}

export class ProfileRepository {
  static generateProfileUid() {
    return uuidv4();
  }

  // This is a minimal replication of UserRepository.findById only selecting the data we need here to prevent circular dependency
  private static async findUserByid({ id }: { id: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        startTime: true,
        endTime: true,
        bufferTime: true,
        metadata: true,
      },
    });

    if (!user) {
      return null;
    }
    return {
      ...user,
      metadata: userMetadata.parse(user.metadata),
    };
  }

  private static getInheritedDataFromUser({
    user,
  }: {
    user: Pick<PrismaUser, "name" | "avatarUrl" | "startTime" | "endTime" | "bufferTime">;
  }) {
    return {
      name: user.name,
      avatarUrl: user.avatarUrl,
      startTime: user.startTime,
      endTime: user.endTime,
      bufferTime: user.bufferTime,
    };
  }

  static getLookupTarget(upId: UpId) {
    if (upId.startsWith("usr-")) {
      return {
        type: LookupTarget.User,
        id: parseInt(upId.replace("usr-", "")),
      } as const;
    }
    return {
      type: LookupTarget.Profile,
      id: parseInt(upId),
    } as const;
  }

  private static async _create({
    userId,
    organizationId,
    username,
    email,
    movedFromUserId,
  }: {
    userId: number;
    organizationId: number;
    username: string | null;
    email: string;
    movedFromUserId?: number;
  }) {
    log.debug("_create", safeStringify({ userId, organizationId, username, email }));
    return prisma.profile.create({
      data: {
        uid: ProfileRepository.generateProfileUid(),
        user: {
          connect: {
            id: userId,
          },
        },
        organization: {
          connect: {
            id: organizationId,
          },
        },
        ...(movedFromUserId
          ? {
              movedFromUser: {
                connect: {
                  id: movedFromUserId,
                },
              },
            }
          : null),

        username: username || email.split("@")[0],
      },
    });
  }

  /**
   * Accepts `email` as a source to derive username from when username is null
   * @returns
   */
  static create({
    userId,
    organizationId,
    username,
    email,
  }: {
    userId: number;
    organizationId: number;
    username: string | null;
    email: string;
  }) {
    return ProfileRepository._create({ userId, organizationId, username, email });
  }

  static async upsert({
    create,
    update,
    updateWhere,
  }: {
    create: {
      userId: number;
      organizationId: number;
      username: string | null;
      email: string;
    };
    update: {
      username: string | null;
      email: string;
    };
    updateWhere: {
      userId: number;
      organizationId: number;
    };
  }) {
    return prisma.profile.upsert({
      create: {
        uid: ProfileRepository.generateProfileUid(),
        user: {
          connect: {
            id: create.userId,
          },
        },
        organization: {
          connect: {
            id: create.organizationId,
          },
        },
        username: create.username || create.email.split("@")[0],
      },
      update: {
        username: update.username || update.email.split("@")[0],
      },
      where: {
        userId_organizationId: {
          userId: updateWhere.userId,
          organizationId: updateWhere.organizationId,
        },
      },
    });
  }

  static async createForExistingUser({
    userId,
    organizationId,
    username,
    email,
    movedFromUserId,
  }: {
    userId: number;
    organizationId: number;
    username: string | null;
    email: string;
    movedFromUserId: number;
  }) {
    return await ProfileRepository._create({
      userId,
      organizationId,
      username,
      email: email,
      movedFromUserId,
    });
  }

  static async createManyForExistingUsers({
    users,
    organizationId,
    orgAutoAcceptEmail,
  }: {
    users: { id: number; username: string | null; email: string }[];
    organizationId: number;
    orgAutoAcceptEmail: string;
  }) {
    await prisma.profile.createMany({
      data: users.map((user) => ({
        uid: ProfileRepository.generateProfileUid(),
        userId: user.id,
        organizationId,
        username: user?.username || getOrgUsernameFromEmail(user.email, orgAutoAcceptEmail),
      })),
      skipDuplicates: true,
    });

    // Populate the movedFromUser
    const createdProfiles = await prisma.profile.findMany({
      where: {
        userId: {
          in: users.map((user) => user.id),
        },
        organizationId,
      },
    });

    for (let i = 0; i < createdProfiles.length; i += DATABASE_CHUNK_SIZE) {
      const profilesBatch = createdProfiles.slice(i, i + DATABASE_CHUNK_SIZE);
      await Promise.allSettled([
        profilesBatch.map((profile) => {
          prisma.user.update({
            where: {
              id: profile.userId,
            },
            data: {
              movedToProfile: {
                connect: { id: profile.id },
              },
            },
          });
        }),
      ]);
    }
  }

  static async createManyPromise({
    users,
    organizationId,
    orgAutoAcceptEmail,
  }: {
    users: { id: number; username: string | null; email: string }[];
    organizationId: number;
    orgAutoAcceptEmail: string;
  }) {
    return await prisma.profile.createMany({
      data: users.map((user) => ({
        uid: ProfileRepository.generateProfileUid(),
        userId: user.id,
        organizationId,
        username: user?.username || getOrgUsernameFromEmail(user.email, orgAutoAcceptEmail),
      })),
      skipDuplicates: true,
    });
  }

  static createMany({
    users,
    organizationId,
    orgAutoAcceptEmail,
  }: {
    users: { id: number; username: string | null; email: string }[];
    organizationId: number;
    orgAutoAcceptEmail: string;
  }) {
    return prisma.profile.createMany({
      data: users.map((user) => ({
        uid: ProfileRepository.generateProfileUid(),
        userId: user.id,
        organizationId,
        username: user?.username || getOrgUsernameFromEmail(user.email, orgAutoAcceptEmail),
      })),
      skipDuplicates: true,
    });
  }

  static delete({ userId, organizationId }: { userId: number; organizationId: number }) {
    // Even though there can be just one profile matching a userId and organizationId, we are using deleteMany as it won't error if the profile doesn't exist
    return prisma.profile.deleteMany({
      where: { userId, organizationId },
    });
  }

  static deleteMany({ userIds }: { userIds: number[] }) {
    // Even though there can be just one profile matching a userId and organizationId, we are using deleteMany as it won't error if the profile doesn't exist
    return prisma.profile.deleteMany({
      where: { userId: { in: userIds } },
    });
  }

  static async findByUserIdAndOrgId({
    userId,
    organizationId,
  }: {
    userId: number;
    organizationId: number | null;
  }) {
    if (!organizationId) {
      return null;
    }
    const profile = await prisma.profile.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: {
          select: organizationSelect,
        },
        user: {
          select: userSelect,
        },
      },
    });

    if (!profile) {
      return null;
    }

    const organization = getParsedTeam(profile.organization);
    return normalizeProfile({
      ...profile,
      organization: {
        ...organization,
        requestedSlug: organization.metadata?.requestedSlug ?? null,
        metadata: organization.metadata,
      },
    });
  }

  static async findByOrgIdAndUsername({
    organizationId,
    username,
  }: {
    organizationId: number;
    username: string;
  }) {
    const profile = await prisma.profile.findUnique({
      where: {
        username_organizationId: {
          username,
          organizationId,
        },
      },
      include: {
        organization: {
          select: organizationSelect,
        },
        user: {
          select: userSelect,
        },
      },
    });
    return profile;
  }

  static async findByUpId(upId: string) {
    const lookupTarget = ProfileRepository.getLookupTarget(upId);
    log.debug("findByUpId", safeStringify({ upId, lookupTarget }));
    if (lookupTarget.type === LookupTarget.User) {
      const user = await this.findUserByid({ id: lookupTarget.id });
      if (!user) {
        return null;
      }
      return {
        username: user.username,
        upId: `usr-${user.id}`,
        id: null,
        organizationId: null,
        organization: null,
        ...ProfileRepository.getInheritedDataFromUser({ user }),
      };
    }

    const profile = await ProfileRepository.findById(lookupTarget.id);
    if (!profile) {
      return null;
    }
    const user = profile.user;
    if (profile.organization?.isPlatform && !user.isPlatformManaged) {
      return {
        ...this.buildPersonalProfileFromUser({ user }),
        ...ProfileRepository.getInheritedDataFromUser({ user }),
      };
    }
    return {
      ...profile,
      ...ProfileRepository.getInheritedDataFromUser({ user }),
    };
  }

  static async findById(id: number | null) {
    if (!id) {
      return null;
    }

    const profile = await prisma.profile.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: userSelect,
        },
        movedFromUser: {
          select: {
            id: true,
          },
        },
        organization: {
          select: {
            id: true,
            logoUrl: true,
            name: true,
            slug: true,
            metadata: true,
            bannerUrl: true,
            isPrivate: true,
            isPlatform: true,
            hideBranding: true,
            organizationSettings: {
              select: {
                lockEventTypeCreationForUsers: true,
                allowSEOIndexing: true,
              },
            },
            members: {
              distinct: ["role"],
              select: membershipSelect,
              where: {
                accepted: true,
                // Filter out memberships that are not owned by the user
                user: { profiles: { some: { id } } },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return null;
    }

    return normalizeProfile(profile);
  }

  static async findManyByOrgSlugOrRequestedSlug({
    usernames,
    orgSlug,
  }: {
    usernames: string[];
    orgSlug: string;
  }) {
    logger.debug("findManyByOrgSlugOrRequestedSlug", safeStringify({ usernames, orgSlug }));
    const profiles = await prisma.profile.findMany({
      where: {
        username: {
          in: usernames,
        },
        organization: whereClauseForOrgWithSlugOrRequestedSlug(orgSlug),
      },
      include: {
        user: {
          select: userSelect,
        },
        organization: {
          select: organizationWithSettingsSelect,
        },
      },
    });

    return profiles.map(normalizeProfile);
  }

  static async findAllProfilesForUserIncludingMovedUser(user: {
    id: number;
    username: string | null;
  }): Promise<UserProfile[]> {
    const profiles = await ProfileRepository.findManyForUser(user);
    // User isn't member of any organization. Also, he has no user profile. We build the profile from user table
    if (!profiles.length) {
      return [
        ProfileRepository.buildPersonalProfileFromUser({
          user,
        }),
      ];
    }

    return profiles;
  }

  static async findManyForUsers(userIds: number[]) {
    const profiles = await prisma.profile.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      include: {
        organization: {
          select: organizationSelect,
        },
      },
    });

    return profiles.map((profile) => {
      const parsedOrganization = getParsedTeam(profile.organization);

      return normalizeProfile({
        username: profile.username,
        id: profile.id,
        userId: profile.userId,
        uid: profile.uid,
        name: parsedOrganization.name,
        organizationId: profile.organizationId,
        organization: {
          ...parsedOrganization,
          requestedSlug: parsedOrganization.metadata?.requestedSlug ?? null,
          metadata: parsedOrganization.metadata,
        },
      });
    });
  }

  static async findManyForUser(user: { id: number }) {
    const profiles = (
      await prisma.profile.findMany({
        where: {
          userId: user.id,
        },
        include: {
          organization: {
            select: organizationSelect,
          },
        },
      })
    )
      .map((profile) => {
        return {
          ...profile,
          organization: getParsedTeam(profile.organization),
        };
      })
      .map((profile) => {
        return normalizeProfile({
          username: profile.username,
          id: profile.id,
          userId: profile.userId,
          uid: profile.uid,
          name: profile.organization.name,
          organizationId: profile.organizationId,
          organization: {
            ...profile.organization,
            requestedSlug: profile.organization.metadata?.requestedSlug ?? null,
            metadata: profile.organization.metadata,
          },
        });
      });
    return profiles;
  }

  static async findManyForOrg({ organizationId }: { organizationId: number }) {
    return await prisma.profile.findMany({
      where: {
        organizationId,
      },
      include: {
        user: {
          select: userSelect,
        },
        organization: {
          select: organizationSelect,
        },
      },
    });
  }

  static async findByUserIdAndProfileId({ userId, profileId }: { userId: number; profileId: number }) {
    const profile = await prisma.profile.findUnique({
      where: {
        userId,
        id: profileId,
      },
      include: {
        organization: {
          select: organizationSelect,
        },
        user: {
          select: userSelect,
        },
      },
    });
    if (!profile) {
      return profile;
    }
    return normalizeProfile(profile);
  }

  static async findByUserIdAndOrgSlug({
    userId,
    organizationId,
  }: {
    userId: number;
    organizationId: number;
  }) {
    const profile = await prisma.profile.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        organization: {
          select: organizationSelect,
        },
      },
    });
    return profile;
  }

  /**
   * Personal profile should come from Profile table only
   */
  static buildPersonalProfileFromUser({
    user,
  }: {
    user: { username: string | null; id: number };
  }): UserAsPersonalProfile {
    return {
      id: null,
      upId: `usr-${user.id}`,
      username: user.username,
      organizationId: null,
      organization: null,
    };
  }

  static _getPrismaWhereForProfilesOfOrg({ orgSlug }: { orgSlug: string | null }) {
    return {
      profiles: {
        ...(orgSlug
          ? {
              some: {
                organization: {
                  slug: orgSlug,
                },
              },
            }
          : // If it's not orgSlug we want to ensure that no profile is there. Having a profile means that the user is a member of some organization.
            {
              none: {},
            }),
      },
    };
  }
}

export const normalizeProfile = <
  T extends {
    id: number;
    organization: Pick<Team, keyof typeof organizationSelect>;
    createdAt?: Date;
    updatedAt?: Date;
  }
>(
  profile: T
) => {
  return {
    ...profile,
    upId: profile.id.toString(),
    organization: getParsedTeam(profile.organization),
    // Make these ↓ props ISO strings so that they can be returned from getServerSideProps as is without any issues
    ...(profile.createdAt ? { createdAt: profile.createdAt.toISOString() } : null),
    ...(profile.updatedAt ? { updatedAt: profile.updatedAt.toISOString() } : null),
  };
};
