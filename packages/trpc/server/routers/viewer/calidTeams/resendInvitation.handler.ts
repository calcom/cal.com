import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { VerificationTokenRepository } from "@calcom/lib/server/repository/verificationToken";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TResendCalidInvitationInputSchema } from "./resendInvitation.schema";

type ResendInvitationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendCalidInvitationInputSchema;
};

async function ensureCalidTeamAdminPermissions(userId: number, teamId: number) {
  const membership = await prisma.calIdMembership.findFirst({
    where: {
      userId,
      calIdTeamId: teamId,
      role: {
        in: [MembershipRole.OWNER, MembershipRole.ADMIN],
      },
    },
  });

  if (!membership) {
    throw new Error("You don't have permission to resend invitations for this team");
  }
}

export const resendCalidInvitationHandler = async ({ ctx, input }: ResendInvitationOptions) => {
  const team = await prisma.calIdTeam.findUnique({
    where: { id: input.teamId },
    include: {
      members: true,
    },
  });

  if (!team) {
    throw new Error("Team not found");
  }

  await ensureCalidTeamAdminPermissions(ctx.user.id, input.teamId);

  let verificationToken;

  try {
    verificationToken = await VerificationTokenRepository.updateTeamInviteTokenExpirationDate({
      email: input.email,
      teamId: input.teamId,
      expiresInDays: 7,
    });
  } catch (error) {
    console.error("[resendCalidInvitationHandler] Error updating verification token: ", error);
  }

  const inviteTeamOptions = {
    joinLink: `${WEBAPP_URL}/auth/login?callbackUrl=/settings/teams`,
    isCalcomMember: true,
    isAutoJoin: false,
  };

  if (verificationToken) {
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
    isOrg: false,
    parentTeamName: null,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  });

  return input;
};

export default resendCalidInvitationHandler;
