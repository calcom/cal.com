import type { User as PrismaUser } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import type { PersonalProfile } from "@calcom/types/UserProfile";

import logger from "../../logger";
import { getParsedTeam } from "./teamUtils";
import { User } from "./user";

const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  metadata: true,
  calVideoLogo: true,
};

export enum LookupTarget {
  User,
  Profile,
}

export class Profile {
  static generateProfileUid() {
    return uuidv4();
  }

  private static getInheritedDataFromUser({ user }: { user: PrismaUser }) {
    return {
      name: user.name,
      avatarUrl: user.avatarUrl,
      startTime: user.startTime,
      endTime: user.endTime,
      bufferTime: user.bufferTime,
      avatar: user.avatar,
    };
  }

  static getLookupTarget(id: string) {
    if (id.startsWith("usr-")) {
      return {
        type: LookupTarget.User,
        id: parseInt(id.replace("usr-", "")),
      } as const;
    }
    if (id.startsWith("pfl")) {
      return {
        type: LookupTarget.Profile,
        id: parseInt(id.replace("pfl-", "")),
      } as const;
    }
    throw new Error(`Invalid lookup id: ${id}`);
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
    return prisma.profile.create({
      data: {
        uid: Profile.generateProfileUid(),
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
    return Profile._create({ userId, organizationId, username, email });
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
    return await Profile._create({
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
        uid: Profile.generateProfileUid(),
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

  static async getProfileByUserIdAndOrgId({
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
        user: true,
      },
    });

    if (!profile) {
      return null;
    }

    const organization = getParsedTeam(profile.organization);
    return {
      ...profile,
      organization: {
        ...organization,
        requestedSlug: organization.metadata?.requestedSlug ?? null,
        metadata: organization.metadata,
      },
    };
  }

  static async getProfileByOrgIdAndUsername({
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
        user: true,
      },
    });
    return profile;
  }

  static async findByIdWithLegacySupport(id: string) {
    const lookupTarget = Profile.getLookupTarget(id);
    if (lookupTarget.type === LookupTarget.User) {
      const user = await User.getUserById({ id: lookupTarget.id });
      if (!user) {
        return null;
      }
      return {
        username: user.username,
        legacyId: id,
        id: user.id,
        ...Profile.getInheritedDataFromUser({ user }),
      };
    } else {
      const profile = await Profile.getProfile(lookupTarget.id);
      if (!profile) {
        return null;
      }
      const user = profile.user;
      return {
        id: profile.id,
        legacyId: id,
        username: profile.username,
        ...Profile.getInheritedDataFromUser({ user }),
      };
    }
  }

  static async getProfile(id: number | null) {
    if (!id) {
      return null;
    }

    const profile = await prisma.profile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        organization: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!profile) {
      return null;
    }

    return enrichProfile(profile);
  }

  static async getProfilesBySlugs({ usernames, orgSlug }: { usernames: string[]; orgSlug: string }) {
    logger.debug("getProfileBySlugs", { usernames, orgSlug });
    const profiles = await prisma.profile.findMany({
      where: {
        username: {
          in: usernames,
        },
        organization: {
          slug: orgSlug,
        },
      },
      include: {
        user: true,
        organization: {
          select: organizationSelect,
        },
      },
    });

    return profiles.map(enrichProfile);
  }

  static async getAllProfilesForUser(user: { id: number; username: string | null }) {
    const allProfiles = [
      {
        username: user.username,
        name: "Personal",
        id: null as number | null,
        organization: null as { id: number; name: string } | null,
      },
      ...(await Profile.getOrgProfilesForUser(user)),
    ];

    return allProfiles;
  }

  static async getOrgProfilesForUser(user: { id: number }) {
    const profiles = (
      await prisma.profile.findMany({
        where: {
          userId: user.id,
        },
        include: {
          organization: {
            select: organizationSelect,
          },
          user: true,
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
        return {
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
          user: profile.user,
        };
      });
    return profiles;
  }

  static async getAllProfilesForOrg({ organizationId }: { organizationId: number }) {
    return await prisma.profile.findMany({
      where: {
        organizationId,
      },
      include: {
        user: true,
        organization: {
          select: organizationSelect,
        },
      },
    });
  }

  static getPersonalProfile({ user }: { user: { username: string | null; id: number } }): PersonalProfile {
    return {
      id: null,
      legacyId: `usr-${user.id}`,
      username: user.username,
      organizationId: null,
      organization: null,
    };
  }
}

export const enrichProfile = <
  T extends {
    id: number;
    organization: Pick<Team, keyof typeof organizationSelect>;
    createdAt: Date;
    updatedAt: Date;
  }
>(
  profile: T
) => {
  return {
    ...profile,
    legacyId: `pfl-${profile.id}`,
    organization: getParsedTeam(profile.organization),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
};
