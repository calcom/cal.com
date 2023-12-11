import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import {
  checkPermissions,
  getTeamOrThrow,
  getUsernameOrEmailsToInvite,
  getOrgConnectionInfo,
  getIsOrgVerified,
  sendVerificationEmail,
  getUsersToInvite,
  createNewUsersConnectToOrgIfExists,
  createProvisionalMemberships,
  groupUsersByJoinability,
  sendTeamInviteEmails,
  sendEmails,
} from "./utils";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const translation = await getTranslation(input.language ?? "en", "common");
  await checkRateLimitAndThrowError({
    identifier: `invitedBy:${ctx.user.id}`,
  });
  await checkPermissions({
    userId: ctx.user.id,
    teamId:
      ctx.user.organization.id && ctx.user.organization.isOrgAdmin ? ctx.user.organization.id : input.teamId,
    isOrg: input.isOrg,
  });

  const team = await getTeamOrThrow(input.teamId, input.isOrg);
  const { autoAcceptEmailDomain, orgVerified } = getIsOrgVerified(input.isOrg, team);
  const usernameOrEmailsToInvite = await getUsernameOrEmailsToInvite(input.usernameOrEmail);
  const orgConnectInfoByUsernameOrEmail = usernameOrEmailsToInvite.reduce((acc, usernameOrEmail) => {
    return {
      ...acc,
      [usernameOrEmail]: getOrgConnectionInfo({
        orgVerified,
        orgAutoAcceptDomain: autoAcceptEmailDomain,
        usersEmail: usernameOrEmail,
        team,
        isOrg: input.isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
  const existingUsersWithMembersips = await getUsersToInvite({
    usernamesOrEmails: usernameOrEmailsToInvite,
    isInvitedToOrg: input.isOrg,
    team,
  });
  const existingUsersEmailsAndUsernames = existingUsersWithMembersips.reduce(
    (acc, user) => ({
      emails: user.email ? [...acc.emails, user.email] : acc.emails,
      usernames: user.username ? [...acc.usernames, user.username] : acc.usernames,
    }),
    { emails: [], usernames: [] } as { emails: string[]; usernames: string[] }
  );
  const newUsersEmailsOrUsernames = usernameOrEmailsToInvite.filter(
    (usernameOrEmail) =>
      !existingUsersEmailsAndUsernames.emails.includes(usernameOrEmail) &&
      !existingUsersEmailsAndUsernames.usernames.includes(usernameOrEmail)
  );

  // deal with users to create and invite to team/org
  if (newUsersEmailsOrUsernames.length) {
    await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails: newUsersEmailsOrUsernames,
      input,
      connectionInfoMap: orgConnectInfoByUsernameOrEmail,
      autoAcceptEmailDomain,
      parentId: team.parentId,
    });
    const sendVerifEmailsPromises = newUsersEmailsOrUsernames.map((usernameOrEmail) => {
      return sendVerificationEmail({
        usernameOrEmail,
        team,
        translation,
        ctx,
        input,
        connectionInfo: orgConnectInfoByUsernameOrEmail[usernameOrEmail],
      });
    });
    sendEmails(sendVerifEmailsPromises);
  }

  // deal with existing users invited to join the team/org
  if (existingUsersWithMembersips.length) {
    const [autoJoinUsers, regularUsers] = groupUsersByJoinability({
      existingUsersWithMembersips,
      team,
    });

    // invited users can autojoin, create their memberships in org
    if (autoJoinUsers.length) {
      await prisma.membership.createMany({
        data: autoJoinUsers.map((userToAutoJoin) => ({
          userId: userToAutoJoin.id,
          teamId: team.id,
          accepted: true,
          role: input.role,
        })),
      });
    }

    // invited users cannot autojoin, create provisional memberships and send email
    if (regularUsers.length) {
      await createProvisionalMemberships({
        input,
        invitees: regularUsers,
      });
      await sendTeamInviteEmails({
        currentUserName: ctx?.user?.name,
        currentUserTeamName: team?.name,
        existingUsersWithMembersips: regularUsers,
        language: translation,
        isOrg: input.isOrg,
        teamId: team.id,
      });
    }
  }

  if (IS_TEAM_BILLING_ENABLED) {
    if (team.parentId) {
      await updateQuantitySubscriptionFromStripe(team.parentId);
    } else {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    }
  }
  return input;
};

export default inviteMemberHandler;
