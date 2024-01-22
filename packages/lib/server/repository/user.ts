import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { UserProfile } from "@calcom/types/UserProfile";

import { isOrganization } from "../../entityPermissionUtils";
import logger from "../../logger";
import { safeStringify } from "../../safeStringify";
import { ProfileRepository } from "./profile";
import { getParsedTeam } from "./teamUtils";
import type { User as UserType, Prisma } from ".prisma/client";

const log = logger.getSubLogger({ prefix: ["[repository/user]"] });
type ProfileId = number | null;
type UpId = string;
export const ORGANIZATION_ID_UNKNOWN = "ORGANIZATION_ID_UNKNOWN";
export class UserRepository {
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
    const { acceptedTeamMemberships } = await UserRepository.getTeamsFromUserId({
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

  static async getProfile({ profileId, userId }: { profileId: ProfileId; userId: number }) {
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
        accepted: true,
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
    orgSlug,
    usernameList,
  }: {
    orgSlug: string | null;
    usernameList: string[];
  }) {
    const { where, profiles } = await UserRepository._getWhereClauseForGettingUsers({
      orgSlug,
      usernameList,
    });

    return (
      await prisma.user.findMany({
        where,
      })
    ).map((user) => {
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

  static async _getWhereClauseForGettingUsers({
    orgSlug,
    usernameList,
  }: {
    orgSlug: string | null;
    usernameList: string[];
  }) {
    // Lookup in profiles because that's where the organization usernames exist
    const profiles = orgSlug
      ? (
          await ProfileRepository.getProfilesBySlugs({
            orgSlug: orgSlug,
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

    const orgProfiles = await ProfileRepository.getAllProfilesForUser(user);
    return {
      ...user,
      orgProfiles,
    };
  }

  static async getUserById({ id }: { id: number }) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      return null;
    }
    return user;
  }

  static async getAllUsersForOrganization({ organizationId }: { organizationId: number }) {
    const profiles = await ProfileRepository.getAllProfilesForOrg({ organizationId });
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
    const orgProfiles = await ProfileRepository.getOrgProfilesForUser({ id: userId });
    return orgProfiles.length > 0;
  }

  static async enrichUserWithProfile<T extends { username: string | null; id: number }>({
    user,
    upId,
  }: {
    user: T;
    upId: UpId;
  }) {
    log.debug("enrichUserWithProfile", safeStringify({ user, upId }));
    const profile = await ProfileRepository.findById(upId);
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

  static async enrichUserWithOrganizationProfile<T extends { id: number; username: string | null }>({
    user,
    organizationId,
  }: {
    user: T;
    /**
     * It would be made mandatory to pass an organizationId here
     * Pass ORGANIZATION_ID_UNKNOWN to indicate that the organizationId is unknown. This is needed till we have a clear way to know at the caller side as to which profile is needed.
     * If you don't have organizationId but have profileId use `enrichUserWithProfile` instead
     */
    organizationId: number | null | typeof ORGANIZATION_ID_UNKNOWN;
  }): Promise<T & { profile: UserProfile }> {
    if (typeof organizationId === "number") {
      const profile = await ProfileRepository.findByUserIdAndOrgId({
        userId: user.id,
        organizationId: organizationId,
      });
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

    // An explicity null organizationId means that non org profile is requested
    if (organizationId === null) {
      return {
        ...user,
        profile: ProfileRepository.buildPersonalProfileFromUser({ user }),
      };
    }

    // TODO: OrgNewSchema - later -> Correctly determine the organizationId at the caller level and then pass that.
    // organizationId not specified Get the first organization profile for now
    const orgProfiles = await ProfileRepository.getOrgProfilesForUser({ id: user.id });

    if (orgProfiles.length > 1) {
      logger.error(
        "User having more than one organization profile doesnt work. You need to pass profileId direcctly"
      );
    }

    if (orgProfiles.length) {
      // TODO: OrgNewSchema - later -> Support choosing the correct organization from either req.user or better organizationId in the handleNewBooking payload itself
      return {
        ...user,
        profile: orgProfiles[0],
      };
    }

    // If no organization profile exists use the personal profile
    return {
      ...user,
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
              calVideoLogo: string | null;
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
      const profiles = await ProfileRepository.getOrgProfilesForUser(entity.user);
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
}
