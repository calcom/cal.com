import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TInviteMemberInputSchema } from "./schema";
import { assertCanManageOrganization } from "./organizationUtils";

type InviteMemberHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "name" | "email" | "locale">;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberHandlerOptions) => {
  const membership = await assertCanManageOrganization({ userId: ctx.user.id });

  const invitee = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, name: true, email: true, locale: true, organizationId: true },
  });

  if (!invitee) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No user found with that email. They must have a Cal.diy account first.",
    });
  }

  if (invitee.organizationId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This user already belongs to an organization.",
    });
  }

  try {
    await prisma.membership.create({
      data: {
        userId: invitee.id,
        teamId: membership.team.id,
        role: input.role ?? MembershipRole.MEMBER,
        accepted: false,
      },
    });
  } catch (err: unknown) {
    const isPrismaUniqueViolation =
      typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    if (isPrismaUniqueViolation) {
      throw new TRPCError({ code: "CONFLICT", message: "Invite already sent or user is already a member." });
    }
    throw err;
  }

  const inviteeT = await getTranslation(invitee.locale ?? "en", "common");

  await sendTeamInviteEmail({
    language: inviteeT,
    from: ctx.user.name ?? ctx.user.email,
    to: invitee.email,
    teamName: membership.team.name,
    joinLink: `${WEBAPP_URL}/settings/organizations/invites`,
    isCalcomMember: true,
    isAutoJoin: false,
    isOrg: true,
    parentTeamName: undefined,
    isExistingUserMovedToOrg: false,
    prevLink: null,
    newLink: null,
  }).catch((err: unknown) => {
    console.error("Failed to send invite email", err);
  });

  return { success: true };
};
