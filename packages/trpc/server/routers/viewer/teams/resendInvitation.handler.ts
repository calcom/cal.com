import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { checkPermissions, getTeamOrThrow } from "./inviteMember/utils";
import type { TResendInvitationInputSchema } from "./resendInvitation.schema";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendInvitationInputSchema;
};

export const resendInvitationHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const team = await getTeamOrThrow(input.teamId);

  await checkPermissions({
    userId: ctx.user.id,
    teamId:
      ctx.user.organization.id && ctx.user.organization.isOrgAdmin ? ctx.user.organization.id : input.teamId,
    isOrg: input.isOrg,
  });

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: input.email,
      teamId: input.teamId,
    },
    select: {
      token: true,
    },
  });

  const inviteTeamOptions = {
    joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
    isCalcomMember: true,
    isAutoJoin: false,
  };

  if (verificationToken) {
    // Token only exists if user is CAL user but hasn't completed onboarding.
    inviteTeamOptions.joinLink = `${WEBAPP_URL}/signup?token=${verificationToken.token}&callbackUrl=/getting-started`;
    inviteTeamOptions.isCalcomMember = false;
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
