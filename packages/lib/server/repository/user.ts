import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { isOrganization } from "../../entityPermissionUtils";
import { Profile } from "./profile";
import { getParsedTeam } from "./teamUtils";
import type { User as UserType } from ".prisma/client";

export class User {
  static async getTeamsFromUserId({ userId }: { userId: UserType["id"] }) {
    const teamMemberships = await prisma.membership.findMany({
      where: {
        userId: userId,
      },
      include: {
        team: true,
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

  static async getOrganizations({ userId }: { userId: UserType["id"] }) {
    const { acceptedTeamMemberships } = await User.getTeamsFromUserId({
      userId,
    });

    const acceptedOrgMemberships = acceptedTeamMemberships.filter((membership) =>
      isOrganization({ team: membership.team })
    );

    const organizations = acceptedOrgMemberships.map((membership) => membership.team);

    return {
      organizations,
    };
  }

  static async getOrganizationProfile({ profileId, userId }: { profileId: number | null; userId: number }) {
    if (!profileId) {
      return null;
    }
    const profile = await prisma.profile.findUnique({
      where: {
        id: profileId,
      },
      include: {
        organization: true,
      },
    });

    if (!profile) {
      return null;
    }
    if (profile.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const parsedMetadata = teamMetadataSchema.parse(profile.organization.metadata);
    return {
      ...profile,
      organization: {
        ...profile.organization,
        requestedSlug: parsedMetadata?.requestedSlug ?? null,
        metadata: parsedMetadata,
      },
    };
  }

  static async getOrganizationForUser({
    userId,
    organizationId,
  }: {
    userId: number;
    organizationId: number;
  }) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: userId,
        teamId: organizationId,
      },
      include: {
        team: true,
      },
    });

    const team = membership?.team;
    if (!team) {
      return null;
    }
    const parsedMetadata = teamMetadataSchema.parse(team.metadata);
    return {
      ...team,
      requestedSlug: parsedMetadata?.requestedSlug ?? null,
      metadata: parsedMetadata,
    };
  }

  static async getUsersFromUsernameInOrgContext({
    isValidOrgDomain,
    currentOrgDomain,
    usernameList,
  }: {
    isValidOrgDomain: boolean;
    currentOrgDomain: string | null;
    usernameList: string[];
  }) {
    const { where, profiles } = await User._getWhereClauseForGettingUsers({
      isValidOrgDomain,
      currentOrgDomain,
      usernameList,
    });
    console.log("getUsersFromUsernameInOrgContext", JSON.stringify({ where, profiles }));
    return (
      await prisma.user.findMany({
        where,
      })
    ).map((user) => {
      const profile = profiles?.find((profile) => profile.user.id === user.id) ?? null;
      if (!profile) {
        // Profile must be there because profile itself was used to retrieve the user
        throw new Error("Profile couldn't be found");
      }
      const { user: _1, ...profileWithoutUser } = profile;
      return {
        ...user,
        relevantProfile: profileWithoutUser,
        orgProfile: profileWithoutUser,
      };
    });
  }

  static async _getWhereClauseForGettingUsers({
    isValidOrgDomain,
    currentOrgDomain,
    usernameList,
  }: {
    isValidOrgDomain: boolean;
    currentOrgDomain: string | null;
    usernameList: string[];
  }) {
    const isOrgContext = isValidOrgDomain && currentOrgDomain;
    // Lookup in profiles because that's where the organization usernames exist
    const profiles = isOrgContext
      ? (
          await Profile.getProfilesBySlugs({
            orgSlug: currentOrgDomain,
            usernames: usernameList,
          })
        ).map((profile) => ({
          ...profile,
          organization: getParsedTeam(profile.organization),
        }))
      : null;

    const where = profiles
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
        };

    return { where, profiles };
  }

  static async getUserByEmail({ email }: { email: string }) {
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
            team: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const orgProfiles = await Profile.getOrgProfilesForUser(user);
    return {
      ...user,
      orgProfiles,
    };
  }

  static async getAllUsersForOrganization({ organizationId }: { organizationId: number }) {
    const profiles = await Profile.getAllProfilesForOrg({ organizationId });
    return profiles.map((profile) => profile.user);
  }

  static isUserAMemberOfOrganization({
    user,
    organizationId,
  }: {
    user: { profiles: { organizationId: number }[] };
    organizationId: number;
  }) {
    return user.profiles.some((profile) => profile.organizationId === organizationId);
  }

  static async isUserAMemberOfAnyOrganization({ userId }: { userId: number }) {
    const orgProfiles = await Profile.getOrgProfilesForUser({ id: userId });
    return orgProfiles.length > 0;
  }
}
