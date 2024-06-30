import type { User as PrismaUser } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import { whereClauseForOrgWithSlugOrRequestedSlug } from "@calcom/ee/organizations/lib/orgDomains";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { Team } from "@calcom/prisma/client";
import type { UpId, UserAsPersonalProfile, UserProfile } from "@calcom/types/UserProfile";

import logger from "../../logger";
import { getParsedTeam } from "./teamUtils";
import { UserRepository } from "./user";

const userSelect = Prisma.validator<Prisma.UserSelect>()({
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
});

const membershipSelect = Prisma.validator<Prisma.MembershipSelect>()({
  id: true,
  teamId: true,
  userId: true,
  accepted: true,
  role: true,
  disableImpersonation: true,
});

const log = logger.getSubLogger({ prefix: ["repository/profile"] });
const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  metadata: true,
  logoUrl: true,
  calVideoLogo: true,
  bannerUrl: true,
};

export enum LookupTarget {
  User,
  Profile,
}

export class ProfileRepository {
  static generateProfileUid() {
    return uuidv4();
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

  static createMany({
    users,
    organizationId,
  }: {
    users: { id: number; username: string; email: string }[];
    organizationId: number;
  }) {
    return prisma.profile.createMany({
      data: users.map((user) => ({
        uid: ProfileRepository.generateProfileUid(),
        userId: user.id,
        organizationId,
        username: user.username || user.email.split("@")[0],
      })),
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
    const profile = await prisma.profile.findFirst({
      where: {
        userId,
        organizationId,
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
    const profile = await prisma.profile.findFirst({
      where: {
        username,
        organizationId,
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
      const user = await UserRepository.findById({ id: lookupTarget.id });
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
            calVideoLogo: true,
            id: true,
            logoUrl: true,
            name: true,
            slug: true,
            metadata: true,
            bannerUrl: true,
            isPrivate: true,
            isPlatform: true,
            organizationSettings: {
              select: {
                lockEventTypeCreationForUsers: true,
              },
            },
            members: {
              select: membershipSelect,
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
          select: organizationSelect,
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
