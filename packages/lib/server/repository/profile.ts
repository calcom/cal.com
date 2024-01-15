import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

import { HttpError } from "../../http-error";
import logger from "../../logger";
import { getParsedTeam } from "./teamUtils";

const organizationSelect = {
  id: true,
  slug: true,
  name: true,
  metadata: true,
  calVideoLogo: true,
};
export class Profile {
  static createProfile({
    userId,
    organizationId,
    username,
  }: {
    userId: number;
    organizationId: number;
    username: string;
  }) {
    return prisma.profile.create({
      data: {
        uid: uuidv4(),
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
        username,
      },
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

  static async getProfile(id: number | null) {
    if (!id) {
      return null;
    }
    return await prisma.profile.findUnique({
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

    return profiles.map(sanitizeProfile);
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

  static async getRelevantOrgProfile({
    userId,
    ownedByOrganizationId,
  }: {
    userId: number;
    ownedByOrganizationId: number | null;
  }) {
    if (ownedByOrganizationId) {
      const relevantProfile = await Profile.getProfileByUserIdAndOrgId({
        userId,
        organizationId: ownedByOrganizationId,
      });
      return relevantProfile;
    }
    const orgProfiles = await Profile.getOrgProfilesForUser({ id: userId });
    if (orgProfiles.length > 1) {
      // We need to have `ownedByOrganizationId` on the entity to support this
      throw new HttpError({
        statusCode: 400,
        message: "User having more than one organization profile isn't supported yet",
      });
    }
    // TODO: OrgNewSchema - later -> Support choosing the correct organization from either req.user or better organizationId in the handleNewBooking payload itself
    return orgProfiles[0];
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
}

export const sanitizeProfile = <
  T extends {
    createdAt: Date;
    updatedAt: Date;
  }
>(
  profile: T
) => {
  return {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
};
