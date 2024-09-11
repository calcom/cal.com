import { type TFunction } from "i18next";

import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isOrganisationOwner } from "@calcom/lib/server/queries/organisations";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import type { TeamWithParent } from "./types";
import type { Invitation } from "./utils";
import {
  ensureAtleastAdminPermissions,
  getTeamOrThrow,
  getUniqueInvitationsOrThrowIfEmpty,
  getOrgConnectionInfo,
  getOrgState,
  findUsersWithInviteStatus,
  INVITE_STATUS,
  handleExistingUsersInvites,
  handleNewUsersInvites,
} from "./utils";

const log = logger.getSubLogger({ prefix: ["inviteMember.handler"] });

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

function getOrgConnectionInfoGroupedByUsernameOrEmail({
  uniqueInvitations,
  orgState,
  team,
  isOrg,
}: {
  uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
  orgState: ReturnType<typeof getOrgState>;
  team: Pick<TeamWithParent, "parentId" | "id">;
  isOrg: boolean;
}) {
  return uniqueInvitations.reduce((acc, invitation) => {
    return {
      ...acc,
      [invitation.usernameOrEmail]: getOrgConnectionInfo({
        orgVerified: orgState.orgVerified,
        orgAutoAcceptDomain: orgState.autoAcceptEmailDomain,
        email: invitation.usernameOrEmail,
        team,
        isOrg: isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
}

function getInvitationsForNewUsers({
  existingUsersToBeInvited,
  uniqueInvitations,
}: {
  existingUsersToBeInvited: Awaited<ReturnType<typeof findUsersWithInviteStatus>>;
  uniqueInvitations: { usernameOrEmail: string; role: MembershipRole }[];
}) {
  const existingUsersEmailsAndUsernames = existingUsersToBeInvited.reduce(
    (acc, user) => ({
      emails: user.email ? [...acc.emails, user.email] : acc.emails,
      usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
    }),
    { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
  );
  return uniqueInvitations.filter(
    (invitation) =>
      !existingUsersEmailsAndUsernames.emails.includes(invitation.usernameOrEmail) &&
      !existingUsersEmailsAndUsernames.usernames.includes(invitation.usernameOrEmail)
  );
}

function throwIfInvalidInvitationStatus({
  firstExistingUser,
  translation,
}: {
  firstExistingUser: Awaited<ReturnType<typeof findUsersWithInviteStatus>>[number] | undefined;
  translation: TFunction;
}) {
  if (firstExistingUser && firstExistingUser.canBeInvited !== INVITE_STATUS.CAN_BE_INVITED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: translation(firstExistingUser.canBeInvited),
    });
  }
}

function shouldBeSilentAboutErrors(invitations: Invitation[]) {
  const isBulkInvite = invitations.length > 1;
  return isBulkInvite;
}

function buildInvitationsFromInput({
  usernameOrEmail,
  roleForAllInvitees,
}: {
  usernameOrEmail: TInviteMemberInputSchema["usernameOrEmail"];
  roleForAllInvitees: MembershipRole | undefined;
}) {
  const usernameOrEmailList = typeof usernameOrEmail === "string" ? [usernameOrEmail] : usernameOrEmail;

  return usernameOrEmailList.map((usernameOrEmail) => {
    if (typeof usernameOrEmail === "string")
      return { usernameOrEmail: usernameOrEmail, role: roleForAllInvitees ?? MembershipRole.MEMBER };
    return {
      usernameOrEmail: usernameOrEmail.email,
      role: usernameOrEmail.role,
    };
  });
}

type TargetTeam =
  | {
      teamId: number;
    }
  | {
      team: TeamWithParent;
    };

export const inviteMembersWithNoInviterPermissionCheck = async (
  data: {
    // TODO: Remove `input` and instead pass the required fields directly
    language: string;
    inviterName: string | null;
    orgSlug: string | null;
    invitations: {
      usernameOrEmail: string;
      role: MembershipRole;
    }[];
  } & TargetTeam
) => {
  const { inviterName, orgSlug, invitations, language } = data;
  const myLog = log.getSubLogger({ prefix: ["inviteMembers"] });
  const translation = await getTranslation(language ?? "en", "common");
  const team = "team" in data ? data.team : await getTeamOrThrow(data.teamId);
  const isTeamAnOrg = team.isOrganization;

  const uniqueInvitations = await getUniqueInvitationsOrThrowIfEmpty(invitations);
  const beSilentAboutErrors = shouldBeSilentAboutErrors(uniqueInvitations);
  const existingUsersToBeInvited = await findUsersWithInviteStatus({
    invitations: uniqueInvitations,
    team,
  });

  if (!beSilentAboutErrors) {
    // beSilentAboutErrors is false only when there is a single user being invited, so we just check the first user status here
    throwIfInvalidInvitationStatus({ firstExistingUser: existingUsersToBeInvited[0], translation });
  }

  const orgState = getOrgState(isTeamAnOrg, team);

  const orgConnectInfoByUsernameOrEmail = getOrgConnectionInfoGroupedByUsernameOrEmail({
    uniqueInvitations,
    orgState,
    team: {
      parentId: team.parentId,
      id: team.id,
    },
    isOrg: isTeamAnOrg,
  });

  const invitationsForNewUsers = getInvitationsForNewUsers({
    existingUsersToBeInvited,
    uniqueInvitations,
  });

  const inviter = { name: inviterName };

  if (invitationsForNewUsers.length) {
    await handleNewUsersInvites({
      invitationsForNewUsers,
      team,
      orgConnectInfoByUsernameOrEmail,
      teamId: team.id,
      language,
      isOrg: isTeamAnOrg,
      inviter,
      autoAcceptEmailDomain: orgState.autoAcceptEmailDomain,
    });
  }

  // Existing users have a criteria to be invited
  const invitableExistingUsers = existingUsersToBeInvited.filter(
    (invitee) => invitee.canBeInvited === INVITE_STATUS.CAN_BE_INVITED
  );

  myLog.debug(
    "Notable variables:",
    safeStringify({
      uniqueInvitations,
      orgConnectInfoByUsernameOrEmail,
      invitableExistingUsers,
      existingUsersToBeInvited,
      invitationsForNewUsers,
    })
  );

  if (invitableExistingUsers.length) {
    await handleExistingUsersInvites({
      invitableExistingUsers,
      team,
      orgConnectInfoByUsernameOrEmail,
      teamId: team.id,
      language,
      isOrg: isTeamAnOrg,
      inviter,
      orgSlug,
    });
  }

  if (IS_TEAM_BILLING_ENABLED) {
    await updateQuantitySubscriptionFromStripe(team.parentId ?? team.id);
  }

  return {
    // TODO: Better rename it to invitations only maybe?
    usernameOrEmail:
      invitations.length == 1
        ? invitations[0].usernameOrEmail
        : invitations.map((invitation) => invitation.usernameOrEmail),
    numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
  };
};

const inviteMembers = async ({ ctx, input }: InviteMemberOptions) => {
  const { user: inviter } = ctx;

  const inviterOrg = inviter.organization;
  const team = await getTeamOrThrow(input.teamId);
  const isTeamAnOrg = team.isOrganization;

  const invitations = buildInvitationsFromInput({
    usernameOrEmail: input.usernameOrEmail,
    roleForAllInvitees: input.role,
  });
  const isAddingNewOwner = !!invitations.find((invitation) => invitation.role === MembershipRole.OWNER);

  if (isTeamAnOrg) {
    await throwIfInviterCantAddOwnerToOrg();
  }

  await ensureAtleastAdminPermissions({
    userId: inviter.id,
    teamId: inviterOrg.id && inviterOrg.isOrgAdmin ? inviterOrg.id : input.teamId,
    isOrg: isTeamAnOrg,
  });

  const organization = inviter.profile.organization;
  const orgSlug = organization ? organization.slug || organization.requestedSlug : null;
  const result = await inviteMembersWithNoInviterPermissionCheck({
    inviterName: inviter.name,
    team,
    language: input.language,
    orgSlug,
    invitations,
  });
  return result;

  async function throwIfInviterCantAddOwnerToOrg() {
    const isInviterOrgOwner = await isOrganisationOwner(inviter.id, input.teamId);
    if (isAddingNewOwner && !isInviterOrgOwner) throw new TRPCError({ code: "UNAUTHORIZED" });
  }
};

export default async function inviteMemberHandler({ ctx, input }: InviteMemberOptions) {
  const { user: inviter } = ctx;
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${inviter.id}`,
  });
  return await inviteMembers({ ctx, input });
}
