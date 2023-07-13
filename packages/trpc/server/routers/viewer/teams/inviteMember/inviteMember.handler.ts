import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
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
  getUserToInviteOrThrowIfExists,
  checkInputEmailIsValid,
  getOrgConnectionInfo,
  createNewUserConnectToOrgIfExists,
  throwIfInviteIsToOrgAndUserExists,
  createProvisionalMembership,
  getIsOrgVerified,
  sendVerificationEmail,
} from "./utils";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const team = await getTeamOrThrow(input.teamId, input.isOrg);
  const { autoAcceptEmailDomain, orgVerified } = getIsOrgVerified(input.isOrg, team);

  await checkPermissions({ userId: ctx.user.id, teamId: input.teamId, isOrg: input.isOrg });

  const translation = await getTranslation(input.language ?? "en", "common");

  const emailsToInvite = await getEmailsToInvite(input.usernameOrEmail);

  for (const usernameOrEmail of emailsToInvite) {
    const connectionInfo = getOrgConnectionInfo({
      orgVerified,
      orgAutoAcceptDomain: autoAcceptEmailDomain,
      usersEmail: usernameOrEmail,
      team,
      isOrg: input.isOrg,
    });
    const invitee = await getUserToInviteOrThrowIfExists({
      usernameOrEmail,
      orgId: input.teamId,
      isOrg: input.isOrg,
    });

    if (!invitee) {
      checkInputEmailIsValid(usernameOrEmail);

      // valid email given, create User and add to team
      await createNewUserConnectToOrgIfExists({
        usernameOrEmail,
        input,
        connectionInfo,
        parentId: team.parentId,
      });

      await sendVerificationEmail({ usernameOrEmail, team, translation, ctx, input, connectionInfo });
    } else {
      throwIfInviteIsToOrgAndUserExists(invitee, team, input.isOrg);

      // create provisional membership
      await createProvisionalMembership({
        input,
        invitee,
      });

      let sendTo = usernameOrEmail;
      if (!isEmail(usernameOrEmail)) {
        sendTo = invitee.email;
      }
      // inform user of membership by email
      if (input.sendEmailInvitation && ctx?.user?.name && team?.name) {
        const inviteTeamOptions = {
          joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
          isCalcomMember: true,
        };
        /**
         * Here we want to redirect to a differnt place if onboarding has been completed or not. This prevents the flash of going to teams -> Then to onboarding - also show a differnt email template.
         * This only changes if the user is a CAL user and has not completed onboarding and has no password
         */
        if (!invitee.completedOnboarding && !invitee.password && invitee.identityProvider === "CAL") {
          const token = randomBytes(32).toString("hex");
          await prisma.verificationToken.create({
            data: {
              identifier: usernameOrEmail,
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

  if (IS_TEAM_BILLING_ENABLED) {
    if (team.parentId) {
      await updateQuantitySubscriptionFromStripe(team.parentId);
    } else {
      await updateQuantitySubscriptionFromStripe(input.teamId);
    }
  }
  return input;
};
