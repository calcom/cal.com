import { sendTeamInviteEmail } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { checkPermissions, getTeamOrThrow } from "./inviteMember/utils";
import type { TResendInvitationInputSchema } from "./resendInvitation.schema";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TResendInvitationInputSchema;
};

export const resendInvitationHandler = async ({ ctx, input }: InviteMemberOptions) => {
  const team = await getTeamOrThrow(input.teamId, input.isOrg);

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

  if (!verificationToken)
    throw new TRPCError({ code: "NOT_FOUND", message: "Couldn't resend, no existing invitation found." });

  const translation = await getTranslation(input.language ?? "en", "common");

  await sendTeamInviteEmail({
    language: translation,
    from: ctx.user.name || `${team.name}'s admin`,
    to: input.email,
    teamName: team?.parent?.name || team.name,
    joinLink: `${WEBAPP_URL}/signup?token=${verificationToken.token}&callbackUrl=/getting-started`,
    isCalcomMember: false,
    isOrg: input.isOrg,
  });

  return input;
};
