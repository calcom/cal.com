import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { OnboardingPathService } from "@calcom/features/onboarding/lib/onboarding-path.service";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { ensureAtleastAdminPermissions, getTeamOrThrow } from "./inviteMember/utils";
import type { TResendInvitationInputSchema } from "./resendInvitation.schema";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendInvitationInputSchema;
};

export const resendInvitationHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const team = await getTeamOrThrow(input.teamId);

  await ensureAtleastAdminPermissions({
    userId: ctx.user.id,
    teamId:
      ctx.user.organization.id && ctx.user.organization.isOrgAdmin ? ctx.user.organization.id : input.teamId,
    isOrg: input.isOrg,
  });

  let verificationToken;

  try {
    verificationToken = await VerificationTokenRepository.updateTeamInviteTokenExpirationDate({
      email: input.email,
      teamId: input.teamId,
      expiresInDays: 7,
    });
  } catch (error) {
    console.error("[resendInvitationHandler] Error updating verification token: ", error);
  }

  const inviteTeamOptions = {
    joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
    isCalcomMember: true,
    isAutoJoin: false,
  };

  if (verificationToken) {
    try {
      const user = await new UserRepository(prisma).findByEmail({ email: input.email });

      if (user?.completedOnboarding) {
        inviteTeamOptions.joinLink = `${WEBAPP_URL}/teams?token=${verificationToken.token}&autoAccept=true`;
      } else {
        const gettingStartedPath = await OnboardingPathService.getGettingStartedPathWhenInvited(prisma);
        inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${verificationToken.token}&callbackUrl=${gettingStartedPath}`;
        inviteTeamOptions.isCalcomMember = false;
      }
    } catch (error) {
      console.error("[resendInvitationHandler] Error fetching user: ", error);
    }
  }

  const translation = await getTranslation(input.language ?? "en", "common");

  await sendTeamInviteEmail({
    language: translation,
    from: ctx.user.name || `${team.name}'s admin`,
    to: input.email,
    teamName: team.name,
    ...inviteTeamOptions,
    isOrg: input.isOrg,
    parentTeamName: team?.parent?.name,
    // We don't know at his moment if this user was an existing user or a new user as it is a resend. So, we assume it's a new user and we can avoid sending the prevLink and newLink.
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  });

  return input;
};

export default resendInvitationHandler;
