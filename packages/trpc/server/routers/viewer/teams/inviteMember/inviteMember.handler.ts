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
  role,
}: {
  usernameOrEmail: TInviteMemberInputSchema["usernameOrEmail"];
  role: MembershipRole | undefined;
}) {
  const usernameOrEmailList = typeof usernameOrEmail === "string" ? [usernameOrEmail] : usernameOrEmail;

  return usernameOrEmailList.map((item) => {
    if (typeof item === "string") return { usernameOrEmail: item, role: role ?? MembershipRole.MEMBER };
    return {
      usernameOrEmail: item.email,
      role: item.role,
    };
  });
}

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const myLog = log.getSubLogger({ prefix: ["inviteMemberHandler"] });
  const translation = await getTranslation(input.language ?? "en", "common");
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${ctx.user.id}`,
  });

  const invitations = buildInvitationsFromInput({
    usernameOrEmail: input.usernameOrEmail,
    role: input.role,
  });

  const team = await getTeamOrThrow(input.teamId);
  const isInvitationToAnOrg = team.isOrganization;

  const isAddingNewOwner = !!invitations.find((invitation) => invitation.role === MembershipRole.OWNER);
  const inviter = ctx.user;
  const inviterOrg = inviter.organization;

  // Only owners can award owner role in an organization.
  if (isInvitationToAnOrg && isAddingNewOwner && !(await isOrganisationOwner(ctx.user.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  await ensureAtleastAdminPermissions({
    userId: ctx.user.id,
    teamId: inviterOrg.id && inviterOrg.isOrgAdmin ? inviterOrg.id : input.teamId,
    isOrg: isInvitationToAnOrg,
  });

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

  const orgState = getOrgState(isInvitationToAnOrg, team);

  const orgConnectInfoByUsernameOrEmail = getOrgConnectionInfoGroupedByUsernameOrEmail({
    uniqueInvitations,
    orgState,
    team: {
      parentId: team.parentId,
      id: team.id,
    },
    isOrg: isInvitationToAnOrg,
  });

  const invitationsForNewUsers = getInvitationsForNewUsers({
    existingUsersToBeInvited,
    uniqueInvitations,
  });

  if (invitationsForNewUsers.length) {
    await handleNewUsersInvites({
      invitationsForNewUsers,
      team,
      orgConnectInfoByUsernameOrEmail,
      input,
      inviter: ctx.user,
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
      // existingUsersEmailsAndUsernames,
      invitationsForNewUsers,
    })
  );

  if (invitableExistingUsers.length) {
    const organization = ctx.user.profile.organization;
    const orgSlug = organization ? organization.slug || organization.requestedSlug : null;
    await handleExistingUsersInvites({
      invitableExistingUsers,
      team,
      orgConnectInfoByUsernameOrEmail,
      input,
      inviter: ctx.user,
      orgSlug,
    });
  }

  if (IS_TEAM_BILLING_ENABLED) {
    await updateQuantitySubscriptionFromStripe(team.parentId ?? input.teamId);
  }

  return {
    ...input,
    numUsersInvited: invitableExistingUsers.length + invitationsForNewUsers.length,
  };
};

export default inviteMemberHandler;
