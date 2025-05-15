import { ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { Membership, OrganizationSettings, Team } from "@calcom/prisma/client";
import { type User as UserType, type UserPassword } from "@calcom/prisma/client";
import type { Profile as ProfileType } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import { isEmail } from "../util";
import { InvitationService } from "./invitiation.service";
import type { TeamWithParent } from "./types";

const log = logger.getSubLogger({ prefix: ["inviteMember.utils"] });
export type Invitee = Pick<
  UserType,
  "id" | "email" | "username" | "identityProvider" | "completedOnboarding"
>;

export type UserWithMembership = Invitee & {
  teams?: Pick<Membership, "userId" | "teamId" | "accepted" | "role">[];
  profiles: ProfileType[];
  password: UserPassword | null;
};

export type Invitation = {
  usernameOrEmail: string;
  role: MembershipRole;
};

type InvitableExistingUser = UserWithMembership & {
  newRole: MembershipRole;
  needToCreateProfile: boolean | null;
  needToCreateOrgMembership: boolean | null;
};

type InvitableExistingUserWithProfile = InvitableExistingUser & {
  profile: {
    username: string;
  } | null;
};

export async function ensureAtleastAdminPermissions({
  userId,
  teamId,
  isOrg,
}: {
  userId: number;
  teamId: number;
  isOrg?: boolean;
}) {
  // Checks if the team they are inviting to IS the org. Not a child team
  if (isOrg) {
    if (!(await isOrganisationAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  } else {
    // TODO: do some logic here to check if the user is inviting a NEW user to a team that ISNT in the same org
    if (!(await isTeamAdmin(userId, teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
}

export function checkInputEmailIsValid(email: string) {
  if (!isEmail(email))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invite failed because ${email} is not a valid email address`,
    });
}

export async function getUniqueInvitationsOrThrowIfEmpty(invitations: Invitation[]) {
  const usernamesOrEmailsSet = new Set<string>();
  const uniqueInvitations: Invitation[] = [];

  invitations.forEach((usernameOrEmail) => {
    if (usernamesOrEmailsSet.has(usernameOrEmail.usernameOrEmail)) {
      return;
    }
    uniqueInvitations.push(usernameOrEmail);
    usernamesOrEmailsSet.add(usernameOrEmail.usernameOrEmail);
  });

  if (uniqueInvitations.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must provide at least one email address to invite.",
    });
  }

  return uniqueInvitations;
}

export const enum INVITE_STATUS {
  USER_PENDING_MEMBER_OF_THE_ORG = "USER_PENDING_MEMBER_OF_THE_ORG",
  USER_ALREADY_INVITED_OR_MEMBER = "USER_ALREADY_INVITED_OR_MEMBER",
  USER_MEMBER_OF_OTHER_ORGANIZATION = "USER_MEMBER_OF_OTHER_ORGANIZATION",
  CAN_BE_INVITED = "CAN_BE_INVITED",
}

export function canBeInvited(invitee: UserWithMembership, team: TeamWithParent) {
  const myLog = log.getSubLogger({ prefix: ["canBeInvited"] });
  myLog.debug("Checking if user can be invited", safeStringify({ invitee, team }));
  const alreadyInvited = invitee.teams?.find(({ teamId: membershipTeamId }) => team.id === membershipTeamId);
  if (alreadyInvited) {
    return INVITE_STATUS.USER_ALREADY_INVITED_OR_MEMBER;
  }

  const orgMembership = invitee.teams?.find((membership) => membership.teamId === team.parentId);

  // An invitee here won't be a member of the team
  // If he is invited to a sub-team and is already part of the organization.
  if (
    team.parentId &&
    UserRepository.isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
  ) {
    return INVITE_STATUS.CAN_BE_INVITED;
  }

  // user invited to join a team inside an org, but has not accepted invite to org yet
  if (team.parentId && orgMembership && !orgMembership.accepted) {
    return INVITE_STATUS.USER_PENDING_MEMBER_OF_THE_ORG;
  }

  if (
    !ENABLE_PROFILE_SWITCHER &&
    // Member of an organization is invited to join a team that is not a subteam of the organization
    invitee.profiles.find((profile) => profile.organizationId != team.parentId)
  ) {
    return INVITE_STATUS.USER_MEMBER_OF_OTHER_ORGANIZATION;
  }
  return INVITE_STATUS.CAN_BE_INVITED;
}

export async function findUsersWithInviteStatus({
  invitations,
  team,
}: {
  invitations: Invitation[];
  team: TeamWithParent;
}) {
  const usernamesOrEmails = invitations.map((invitation) => invitation.usernameOrEmail);
  const inviteesFromDb = await UserRepository.findUsersWithInviteStatus({
    invitations,
    team,
  });

  const userToRoleMap = buildUserToRoleMap();
  const defaultMemberRole = MembershipRole.MEMBER;
  // Check if the users found in the database can be invited to join the team/org
  return inviteesFromDb.map((inviteeFromDb) => {
    const newRole = getRoleForUser({ email: inviteeFromDb.email, username: inviteeFromDb.username });

    return {
      ...inviteeFromDb,
      newRole: newRole ?? defaultMemberRole,
      canBeInvited: canBeInvited(inviteeFromDb, team),
    };
  });

  function buildUserToRoleMap() {
    const userToRoleMap = new Map<string, MembershipRole>();
    invitations.forEach((invitation) => {
      userToRoleMap.set(invitation.usernameOrEmail, invitation.role);
    });
    return userToRoleMap;
  }

  function getRoleForUser({ email, username }: { email: string; username: string | null }) {
    return userToRoleMap.get(email) || (username ? userToRoleMap.get(username) : defaultMemberRole);
  }
}

export function getOrgConnectionInfo({
  orgAutoAcceptDomain,
  orgVerified,
  isOrg,
  email,
  team,
}: {
  orgAutoAcceptDomain?: string | null;
  orgVerified: boolean | null;
  email: string;
  team: Pick<TeamWithParent, "parentId" | "id">;
  isOrg: boolean;
}) {
  let orgId: number | undefined = undefined;
  let autoAccept = false;

  if (team.parentId || isOrg) {
    orgId = team.parentId || team.id;
    if (email.split("@")[1] == orgAutoAcceptDomain) {
      // We discourage self-served organizations from being able to use auto-accept feature by having a barrier of a fixed number of paying teams in the account for creating the organization
      // We can't put restriction of a published organization here because when we move teams during the onboarding of the organization, it isn't published at the moment and we really need those members to be auto-added
      // Further, sensitive operations like member editing and impersonating are disabled by default, unless reviewed by the ADMIN team
      autoAccept = !!orgVerified;
    } else {
      orgId = undefined;
      autoAccept = false;
    }
  }

  return { orgId, autoAccept };
}

export function getOrgState(
  isOrg: boolean,
  team: TeamAndOrganizationSettings & {
    parent: TeamAndOrganizationSettings | null;
  }
) {
  const parentSettings = team.parent?.organizationSettings;

  if (isOrg && team.organizationSettings?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: team.organizationSettings.isOrganizationVerified,
      orgConfigured: team.organizationSettings.isOrganizationConfigured,
      autoAcceptEmailDomain: team.organizationSettings.orgAutoAcceptEmail,
      orgPublished: !!team.slug,
    };
  } else if (parentSettings?.orgAutoAcceptEmail) {
    return {
      isInOrgScope: true,
      orgVerified: parentSettings.isOrganizationVerified,
      orgConfigured: parentSettings.isOrganizationConfigured,
      autoAcceptEmailDomain: parentSettings.orgAutoAcceptEmail,
      orgPublished: !!team.parent?.slug,
    };
  }

  return {
    isInOrgScope: false,
    orgVerified: null,
    autoAcceptEmailDomain: null,
    orgConfigured: null,
    orgPublished: null,
  };
}

export function getAutoJoinStatus({
  team,
  invitee,
  connectionInfoMap,
}: {
  team: TeamWithParent;
  invitee: UserWithMembership;
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) {
  const isRegularTeam = !team.isOrganization && !team.parentId;

  if (isRegularTeam) {
    // There are no-auto join in regular teams ever
    return {
      autoAccept: false,
      // Following are not relevant for regular teams
      needToCreateProfile: null,
      needToCreateOrgMembership: null,
    };
  }

  const isAutoAcceptEmail = connectionInfoMap[invitee.email].autoAccept;
  const isUserMemberOfTheTeamsParentOrganization = team.parentId
    ? UserRepository.isAMemberOfOrganization({ user: invitee, organizationId: team.parentId })
    : null;

  if (isUserMemberOfTheTeamsParentOrganization) {
    const orgMembership = invitee.teams?.find((membership) => membership.teamId === team.parentId);

    const isAMemberOfOrg = orgMembership?.accepted;
    return {
      autoAccept: isAMemberOfOrg,
      // User is a member of parent organization already - So, no need to create profile and membership with Org
      needToCreateProfile: false,
      needToCreateOrgMembership: false,
    };
  }

  if (isAutoAcceptEmail) {
    // User is not a member of parent organization but has autoAccept email
    // We need to create profile as well as membership with the Org in this case
    return {
      autoAccept: true,
      needToCreateProfile: true,
      needToCreateOrgMembership: true,
    };
  }

  return {
    autoAccept: false,
    needToCreateProfile: false,
    needToCreateOrgMembership: true,
  };
}

// split invited users between ones that can autojoin and the others who cannot autojoin
export const groupUsersByJoinability = ({
  existingUsersWithMemberships,
  team,
  connectionInfoMap,
}: {
  team: TeamWithParent;
  existingUsersWithMemberships: InvitableExistingUserWithProfile[];
  connectionInfoMap: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
}) => {
  const usersToAutoJoin = [];
  const regularUsers = [];

  for (let index = 0; index < existingUsersWithMemberships.length; index++) {
    const existingUserWithMemberships = existingUsersWithMemberships[index];
    const autoJoinStatus = getAutoJoinStatus({
      invitee: existingUserWithMemberships,
      team,
      connectionInfoMap,
    });

    autoJoinStatus.autoAccept
      ? usersToAutoJoin.push({
          ...existingUserWithMemberships,
          ...autoJoinStatus,
        })
      : regularUsers.push({
          ...existingUserWithMemberships,
          ...autoJoinStatus,
        });
  }

  return [usersToAutoJoin, regularUsers];
};

type TeamAndOrganizationSettings = Team & {
  organizationSettings?: OrganizationSettings | null;
};

export async function handleExistingUsersInvites({
  invitableExistingUsers,
  team,
  orgConnectInfoByUsernameOrEmail,
  teamId,
  language,
  inviter,
  orgSlug,
  isOrg,
}: {
  invitableExistingUsers: InvitableExistingUser[];
  team: TeamWithParent;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  teamId: number;
  language: string;
  inviter: {
    name: string | null;
  };
  isOrg: boolean;
  orgSlug: string | null;
}) {
  const translation = await getTranslation(language, "common");
  await InvitationService.handleExistingUsersInvites({
    invitableUsers: invitableExistingUsers,
    team,
    orgConnectInfoByUsernameOrEmail,
    teamId,
    language: translation,
    inviter,
    orgSlug,
    isOrg,
  });
}

export async function handleNewUsersInvites({
  invitationsForNewUsers,
  team,
  orgConnectInfoByUsernameOrEmail,
  teamId,
  language,
  isOrg,
  autoAcceptEmailDomain,
  inviter,
  creationSource,
}: {
  invitationsForNewUsers: Invitation[];
  teamId: number;
  language: string;
  orgConnectInfoByUsernameOrEmail: Record<string, { orgId: number | undefined; autoAccept: boolean }>;
  autoAcceptEmailDomain: string | null;
  team: TeamWithParent;
  inviter: {
    name: string | null;
  };
  isOrg: boolean;
  creationSource: CreationSource;
}) {
  const translation = await getTranslation(language, "common");
  await InvitationService.handleNewUsersInvites({
    invitationsForNewUsers,
    team,
    orgConnectInfoByUsernameOrEmail,
    teamId,
    language: translation,
    isOrg,
    autoAcceptEmailDomain,
    inviter,
    creationSource,
  });
}
