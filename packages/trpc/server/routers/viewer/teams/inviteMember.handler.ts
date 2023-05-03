import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { sendTeamInviteEmail } from "@calcom/emails";
import { updateQuantitySubscriptionFromStripe } from "@calcom/features/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TInviteMemberInputSchema } from "./inviteMember.schema";
import { isEmail } from "./util";

type InviteMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberInputSchema;
};

export const inviteMemberHandler = async ({ ctx, input }: InviteMemberOptions) => {
  if (!(await isTeamAdmin(ctx.user?.id, input.teamId))) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (input.role === MembershipRole.OWNER && !(await isTeamOwner(ctx.user?.id, input.teamId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const translation = await getTranslation(input.language ?? "en", "common");

  const team = await prisma.team.findFirst({
    where: {
      id: input.teamId,
    },
  });

  if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

  const invitee = await prisma.user.findFirst({
    where: {
      OR: [{ username: input.usernameOrEmail }, { email: input.usernameOrEmail }],
    },
  });

  if (!invitee) {
    // liberal email match

    if (!isEmail(input.usernameOrEmail))
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Invite failed because there is no corresponding user for ${input.usernameOrEmail}`,
      });

    // valid email given, create User and add to team
    await prisma.user.create({
      data: {
        email: input.usernameOrEmail,
        invitedTo: input.teamId,
        teams: {
          create: {
            teamId: input.teamId,
            role: input.role as MembershipRole,
          },
        },
      },
    });

    const token: string = randomBytes(32).toString("hex");

    await prisma.verificationToken.create({
      data: {
        identifier: input.usernameOrEmail,
        token,
        expires: new Date(new Date().setHours(168)), // +1 week
      },
    });
    if (ctx?.user?.name && team?.name) {
      await sendTeamInviteEmail({
        language: translation,
        from: ctx.user.name,
        to: input.usernameOrEmail,
        teamName: team.name,
        joinLink: `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/teams`,
        isCalcomMember: false,
      });
    }
  } else {
    // create provisional membership
    try {
      await prisma.membership.create({
        data: {
          teamId: input.teamId,
          userId: invitee.id,
          role: input.role as MembershipRole,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This user is a member of this team / has a pending invitation.",
          });
        }
      } else throw e;
    }

    let sendTo = input.usernameOrEmail;
    if (!isEmail(input.usernameOrEmail)) {
      sendTo = invitee.email;
    }
    // inform user of membership by email
    if (input.sendEmailInvitation && ctx?.user?.name && team?.name) {
      await sendTeamInviteEmail({
        language: translation,
        from: ctx.user.name,
        to: sendTo,
        teamName: team.name,
        joinLink: WEBAPP_URL + "/settings/teams",
        isCalcomMember: true,
      });
    }
  }
  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(input.teamId);
  return input;
};
