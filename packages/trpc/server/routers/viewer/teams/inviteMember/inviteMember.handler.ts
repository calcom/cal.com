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
  getEmailsToInvite,
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
  const emailsToInvite = await getEmailsToInvite(input.usernameOrEmail);
  const orgConnectInfoByEmail = emailsToInvite.reduce((acc, email) => {
    return {
      ...acc,
      [email]: getOrgConnectionInfo({
        orgVerified,
        orgAutoAcceptDomain: autoAcceptEmailDomain,
        usersEmail: email,
        team,
        isOrg: input.isOrg,
      }),
    };
  }, {} as Record<string, ReturnType<typeof getOrgConnectionInfo>>);
  const existingUsersWithMembersips = await getUsersToInvite({
    usernameOrEmail: emailsToInvite,
    isInvitedToOrg: input.isOrg,
    team,
  });
  const existingUsersEmails = existingUsersWithMembersips.map((user) => user.email);
  const newUsersEmails = emailsToInvite.filter((email) => !existingUsersEmails.includes(email));
  // deal with users to create and invite to team/org
  if (newUsersEmails.length) {
    await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails: newUsersEmails,
      input,
      connectionInfoMap: orgConnectInfoByEmail,
      autoAcceptEmailDomain,
      parentId: team.parentId,
    });
    const sendVerifEmailsPromises = newUsersEmails.map((usernameOrEmail) => {
      return sendVerificationEmail({
        usernameOrEmail,
        team,
        translation,
        ctx,
        input,
        connectionInfo: orgConnectInfoByEmail[usernameOrEmail],
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
