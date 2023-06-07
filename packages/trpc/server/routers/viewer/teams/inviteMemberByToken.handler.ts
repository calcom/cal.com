import { Prisma } from "@prisma/client";

import { updateQuantitySubscriptionFromStripe } from "@calcom/ee/teams/lib/payments";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TInviteMemberByTokenSchemaInputSchema } from "./inviteMemberByToken.schema";

type InviteMemberByTokenOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TInviteMemberByTokenSchemaInputSchema;
};

export const inviteMemberByTokenHandler = async ({ ctx, input }: InviteMemberByTokenOptions) => {
  const { token } = input;

  const verificationToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      OR: [{ expiresInDays: null }, { expires: { gte: new Date() } }],
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!verificationToken) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
  if (!verificationToken.teamId || !verificationToken.team)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite token is not associated with any team",
    });

  try {
    await prisma.membership.create({
      data: {
        teamId: verificationToken.teamId,
        userId: ctx.user.id,
        role: MembershipRole.MEMBER,
        accepted: false,
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

  if (IS_TEAM_BILLING_ENABLED) await updateQuantitySubscriptionFromStripe(verificationToken.teamId);

  return verificationToken.team.name;
};
