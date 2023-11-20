import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { isEmail } from "../util";
import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import {
  checkPermissions,
  getTeamOrThrow,
  getEmailsToInvite,
  getOrgConnectionInfo,
  getIsOrgVerified,
  sendVerificationEmail,
  getUsersToInviteOrThrowIfExists,
  createNewUsersConnectToOrgIfExists,
  createProvisionalMemberships,
  getUsersForMemberships,
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
  const orgConnectionInfoMap = emailsToInvite.reduce((acc, email) => {
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
  const existingUsersWithMembersips = await getUsersToInviteOrThrowIfExists({
    usernameOrEmail: emailsToInvite,
    teamId: input.teamId,
    isOrg: input.isOrg,
  });
  const existingUsersEmails = existingUsersWithMembersips.map((user) => user.email);
  const newUsersEmails = emailsToInvite.filter((email) => !existingUsersEmails.includes(email));

  // deal with users to create and invite to team/org
  if (newUsersEmails.length) {
    await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails: newUsersEmails,
      input,
      connectionInfoMap: orgConnectionInfoMap,
      autoAcceptEmailDomain,
      parentId: team.parentId,
    });
    for (let index = 0; index < newUsersEmails.length; index++) {
      const usernameOrEmail = newUsersEmails[index];
      await sendVerificationEmail({
        usernameOrEmail,
        team,
        translation,
        ctx,
        input,
        connectionInfo: orgConnectionInfoMap[usernameOrEmail],
      });
    }
  }

  // deal with existing users invited to join the team/org
  if (existingUsersWithMembersips.length) {
    const [usersToAutoJoin, regularUsers] = getUsersForMemberships({
      existingUsersWithMembersips,
      isOrg: input.isOrg,
      team,
    });

    // invited user can autojoin, create their membership in org
    if (usersToAutoJoin.length) {
      await prisma.membership.createMany({
        data: usersToAutoJoin.map((userToAutoJoin) => ({
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

      for (let index = 0; index < regularUsers.length; index++) {
        const user = regularUsers[index];
        let sendTo = user.email;
        if (!isEmail(user.email)) {
          sendTo = user.email;
        }
        // inform user of membership by email
        if (ctx?.user?.name && team?.name) {
          const inviteTeamOptions = {
            joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
            isCalcomMember: true,
          };
          /**
           * Here we want to redirect to a different place if onboarding has been completed or not. This prevents the flash of going to teams -> Then to onboarding - also show a different email template.
           * This only changes if the user is a CAL user and has not completed onboarding and has no password
           */
          if (!user.completedOnboarding && !user.password && user.identityProvider === "CAL") {
            const token = randomBytes(32).toString("hex");
            await prisma.verificationToken.create({
              data: {
                identifier: user.email,
                token,
                expires: new Date(new Date().setHours(168)), // +1 week
              },
            });

            inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
            inviteTeamOptions.isCalcomMember = false;
          }

          await sendTeamInviteEmail({
            language: translation,
            from: ctx.user.name,
            to: sendTo,
            teamName: team.name,
            ...inviteTeamOptions,
            isOrg: input.isOrg,
          });
        }
      }
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
