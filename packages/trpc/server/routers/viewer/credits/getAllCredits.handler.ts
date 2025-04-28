import { CreditService } from "@calcom/features/ee/billing/credit-service";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;

  const adminMembership = await prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId,
      accepted: true,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!adminMembership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const creditService = new CreditService();

  const teamCredits = await creditService.getAllCreditsForTeam(teamId);
  return { teamCredits };
};
