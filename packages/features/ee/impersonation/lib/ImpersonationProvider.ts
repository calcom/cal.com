import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { ensureOrganizationIsReviewed } from "@calcom/ee/organizations/lib/ensureOrganizationIsReviewed";
import { getOrgFullOrigin, subdomainSuffix } from "@calcom/ee/organizations/lib/orgDomains";
import { getSession } from "@calcom/features/auth/lib/getSession";
import { getSpecificPermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import type { Membership } from "@calcom/prisma/client";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import type { OrgProfile, PersonalProfile, UserAsPersonalProfile } from "@calcom/types/UserProfile";

import { Resource, CustomAction } from "../../../pbac/domain/types/permission-registry";

const teamIdschema = z.object({
  teamId: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive()),
});

type ProfileType =
  | UserAsPersonalProfile
  | PersonalProfile
  | (Omit<OrgProfile, "organization"> & {
      organization: OrgProfile["organization"] & {
        members: Membership[];
      };
    });

const auditAndReturnNextUser = async (
  impersonatedUser: Pick<User, "id" | "username" | "email" | "name" | "role" | "locale"> & {
    organizationId: number | null;
    profile: ProfileType;
  },
  impersonatedByUID: number,
  hasTeam?: boolean,
  isReturningToSelf?: boolean
) => {
  // Log impersonations for audit purposes
  await prisma.impersonations.create({
    data: {
      impersonatedBy: {
        connect: {
          id: impersonatedByUID,
        },
      },
      impersonatedUser: {
        connect: {
          id: impersonatedUser.id,
        },
      },
    },
  });

  const profileOrg = impersonatedUser.profile?.organization;

  const obj = {
    id: impersonatedUser.id,
    username: impersonatedUser.username,
    email: impersonatedUser.email,
    name: impersonatedUser.name,
    role: impersonatedUser.role,
    belongsToActiveTeam: hasTeam,
    organizationId: impersonatedUser.organizationId,
    locale: impersonatedUser.locale,
    profile: impersonatedUser.profile,
    // Add org object if the user belongs to an organization
    ...(profileOrg && {
      org: {
        id: profileOrg.id,
        name: profileOrg.name,
        slug: profileOrg.slug || "",
        logoUrl: profileOrg.logoUrl,
        fullDomain: getOrgFullOrigin(profileOrg.slug || ""),
        domainSuffix: subdomainSuffix(),
        role: profileOrg.members?.[0]?.role || MembershipRole.MEMBER,
      },
    }),
  };

  if (!isReturningToSelf) {
    const impersonatedByUser = await prisma.user.findUnique({
      where: {
        id: impersonatedByUID,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!impersonatedByUser) throw new Error("This user does not exist.");

    return {
      ...obj,
      impersonatedBy: {
        id: impersonatedByUser?.id,
        role: impersonatedByUser?.role,
      },
    };
  }

  return obj;
};

type Credentials = Record<"username" | "teamId" | "returnToId", string> | undefined;

export function parseTeamId(creds: Partial<Credentials>) {
  return creds?.teamId ? teamIdschema.parse({ teamId: creds.teamId }).teamId : undefined;
}

export function checkSelfImpersonation(session: Session | null, creds: Partial<Credentials>) {
  if (session?.user.username === creds?.username || session?.user.email === creds?.username) {
    throw new Error("You cannot impersonate yourself.");
  }
}

export function checkUserIdentifier(creds: Partial<Credentials>) {
  if (!creds?.username) {
    if (creds?.returnToId) return;
    throw new Error("User identifier must be present");
  }
}

export function checkGlobalPermission(session: Session | null) {
  if (
    (session?.user.role !== UserPermissionRole.ADMIN &&
      process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "false") ||
    !session?.user
  ) {
    throw new Error("You do not have permission to do this.");
  }
}

/**
 * Check PBAC permissions for impersonation
 * This function integrates with the new PBAC system to determine impersonation permissions
 */
export async function checkPBACImpersonationPermission({
  userId,
  teamId,
  userRole,
  organizationId,
}: {
  userId: number;
  teamId?: number;
  userRole: MembershipRole;
  organizationId?: number | null;
}): Promise<boolean> {
  try {
    // For organization-level impersonation
    if (organizationId) {
      const orgPermissions = await getSpecificPermissions({
        userId,
        teamId: organizationId,
        resource: Resource.Organization,
        userRole,
        actions: [CustomAction.Impersonate],
        fallbackRoles: {
          [CustomAction.Impersonate]: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });

      if (orgPermissions[CustomAction.Impersonate]) {
        return true;
      }
    }

    // For team-level impersonation
    if (teamId) {
      const teamPermissions = await getSpecificPermissions({
        userId,
        teamId,
        resource: Resource.Team,
        userRole,
        actions: [CustomAction.Impersonate],
        fallbackRoles: {
          [CustomAction.Impersonate]: {
            roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
      });

      return teamPermissions[CustomAction.Impersonate] ?? false;
    }

    // Fallback to role-based check if no team/org context
    return userRole === MembershipRole.ADMIN || userRole === MembershipRole.OWNER;
  } catch (error) {
    console.error("Error checking PBAC impersonation permission:", error);
    // Fallback to role-based check on error
    return userRole === MembershipRole.ADMIN || userRole === MembershipRole.OWNER;
  }
}

async function getImpersonatedUser({
  session,
  teamId,
  creds,
}: {
  session: Session | null;
  teamId: number | undefined;
  creds: Credentials | null;
}) {
  let TeamWhereClause: Prisma.MembershipWhereInput = {
    disableImpersonation: false, // Ensure they have impersonation enabled
    accepted: true, // Ensure they are apart of the team and not just invited.
    team: {
      id: teamId, // Bring back only the right team
    },
  };

  // If you are an admin we dont need to follow this flow -> We can just follow the usual flow
  // If orgId and teamId are the same we can follow the same flow
  if (
    session?.user.org?.id &&
    session.user.org.id !== teamId &&
    session?.user.role !== UserPermissionRole.ADMIN
  ) {
    TeamWhereClause = {
      disableImpersonation: false,
      accepted: true,
      team: {
        id: session.user.org.id,
      },
    };
  }

  // Get user who is being impersonated
  const impersonatedUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: creds?.username }, { email: creds?.username }],
    },
    select: {
      id: true,
      username: true,
      role: true,
      name: true,
      email: true,
      disableImpersonation: true,
      locale: true,
      teams: {
        where: TeamWhereClause,
        select: {
          teamId: true,
          disableImpersonation: true,
          role: true,
        },
      },
    },
  });

  if (!impersonatedUser) {
    throw new Error("This user does not exist");
  }

  const profile = await findProfile(impersonatedUser);

  return {
    ...impersonatedUser,
    organizationId: profile.organization?.id ?? null,
    profile,
  };
}

async function isReturningToSelf({ session, creds }: { session: Session | null; creds: Credentials | null }) {
  const impersonatedByUID = session?.user.impersonatedBy?.id;
  if (!impersonatedByUID || !creds?.returnToId) return;
  const returnToId = parseInt(creds?.returnToId, 10);

  // Ensure session impersonatedUID + the returnToId is the same so we cant take over a random account
  if (impersonatedByUID !== returnToId) return;

  const returningUser = await prisma.user.findUnique({
    where: {
      id: returnToId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      locale: true,
      profiles: true,
      teams: {
        where: {
          accepted: true, // Ensure they are apart of the team and not just invited.
        },
        select: {
          teamId: true,
          disableImpersonation: true,
          role: true,
        },
      },
    },
  });

  if (returningUser) {
    const inOrg =
      returningUser.organizationId || // Keep for backwards compatibility
      returningUser.profiles.some((profile) => profile.organizationId !== undefined); // New way of seeing if the user has a profile in orgs.
    const hasTeams = returningUser.teams.length >= 1;
    if (returningUser.role !== UserPermissionRole.ADMIN && !inOrg && !hasTeams) return;

    const profile = await findProfile(returningUser);
    return {
      user: {
        id: returningUser.id,
        email: returningUser.email,
        locale: returningUser.locale,
        name: returningUser.name,
        organizationId: returningUser.organizationId,
        role: returningUser.role,
        username: returningUser.username,
        profile,
      },
      impersonatedByUID,
      hasTeams,
    };
  }
}

const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { type: "text" },
    teamId: { type: "text" },
    returnToId: { type: "text" },
  },
  async authorize(creds, req) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore need to figure out how to correctly type this
    const session = await getSession({ req });
    const teamId = parseTeamId(creds);
    checkSelfImpersonation(session, creds);
    checkUserIdentifier(creds);

    // Returning to target and UID is self without having to do perm checks.
    const returnToUser = await isReturningToSelf({ session, creds });
    if (returnToUser) {
      return auditAndReturnNextUser(
        returnToUser.user,
        returnToUser.impersonatedByUID,
        returnToUser.hasTeams,
        true
      );
    }

    checkGlobalPermission(session);

    const impersonatedUser = await getImpersonatedUser({ session, teamId, creds });
    if (session?.user.role === UserPermissionRole.ADMIN) {
      if (impersonatedUser.disableImpersonation) {
        throw new Error("This user has disabled Impersonation.");
      }
      return auditAndReturnNextUser(
        impersonatedUser,
        session?.user.id as number,
        impersonatedUser.teams.length > 0 // If the user has any teams, they belong to an active team and we can set the hasActiveTeam ctx to true
      );
    }

    await ensureOrganizationIsReviewed(session?.user.org?.id);

    if (!teamId) throw new Error("Error-teamNotFound: You do not have permission to do this.");

    // Check session
    const sessionUserFromDb = await prisma.user.findUnique({
      where: {
        id: session?.user.id,
      },
      include: {
        teams: {
          where: {
            AND: [
              {
                team: {
                  id: teamId,
                },
              },
            ],
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (sessionUserFromDb?.teams.length === 0 || impersonatedUser.teams.length === 0) {
      throw new Error("Error-UserHasNoTeams: You do not have permission to do this.");
    }

    // Check PBAC permissions for impersonation
    const hasImpersonationPermission = await checkPBACImpersonationPermission({
      userId: session?.user.id as number,
      teamId,
      userRole: sessionUserFromDb?.teams[0].role as MembershipRole,
      organizationId: session?.user.org?.id,
    });

    if (!hasImpersonationPermission) {
      throw new Error("You do not have permission to impersonate this user.");
    }

    // Legacy role check as additional safeguard (PBAC should handle this but keeping for backwards compatibility)
    // We find team by ID so we know there is only one team in the array
    if (
      sessionUserFromDb?.teams[0].role === MembershipRole.ADMIN &&
      impersonatedUser.teams[0].role === MembershipRole.OWNER
    ) {
      throw new Error("You do not have permission to do this.");
    }

    return auditAndReturnNextUser(
      impersonatedUser,
      session?.user.id as number,
      impersonatedUser.teams.length > 0 // If the user has any teams, they belong to an active team and we can set the hasActiveTeam ctx to true
    );
  },
});

export default ImpersonationProvider;

async function findProfile(returningUser: { id: number; username: string | null }) {
  const allOrgProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser({
    id: returningUser.id,
    username: returningUser.username,
  });

  const firstOrgProfile = allOrgProfiles[0];
  const orgMembers = firstOrgProfile.organizationId
    ? await prisma.membership.findMany({
        where: {
          teamId: firstOrgProfile.organizationId,
        },
      })
    : [];

  const profile = !firstOrgProfile.organization
    ? firstOrgProfile
    : {
        ...firstOrgProfile,
        organization: {
          ...firstOrgProfile.organization,
          members: orgMembers,
        },
      };
  return profile;
}
