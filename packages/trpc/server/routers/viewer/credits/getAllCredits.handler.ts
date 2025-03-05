import dayjs from "@calcom/dayjs";
import { prisma } from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetAllCreditsSchema } from "./getAllCredits.schema";

type GetAllCreditsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllCreditsSchema;
};

export const getAllCreditsHandler = async ({ ctx, input }: GetAllCreditsOptions) => {
  const { teamId } = input;
  const userCreditsTable = await prisma.creditsTable.findFirst({
    where: {
      userId: ctx.user.id,
    },
    select: {
      additionalCredits: true,
    },
  });

  let userCredits = userCreditsTable ?? undefined;

  const teamOrOrgId = ctx.user.organizationId ?? teamId;

  if (teamOrOrgId) {
    const teamCreditsTable = await prisma.creditsTable.findFirst({
      where: {
        teamId: teamOrOrgId,
      },
      select: {
        additionalCredits: true,
        expenseLogs: {
          where: {
            date: {
              gte: dayjs().startOf("month").toDate(),
              lte: new Date(),
            },
            creditType: CreditType.MONTHLY,
          },
          select: {
            date: true,
            credits: true,
          },
        },
      },
    });

    // todo: check for active team  subscription

    //calculate total credits
    const activeMembers = await prisma.membership.count({
      where: {
        teamId: teamId,
        accepted: true,
      },
    });

    // todo: where do I get price per seat from?
    const pricePerSeat = 15;
    const totalMonthlyCredits = activeMembers * ((pricePerSeat / 2) * 100);

    const totalMonthlyCreditsUsed =
      teamCreditsTable?.expenseLogs.reduce((sum, log) => sum + log.credits, 0) || 0;

    const teamCredits = {
      totalMonthlyCredits,
      totalRemainingMonthlyCredits: totalMonthlyCredits - totalMonthlyCreditsUsed,
      additionalCredits: teamCreditsTable?.additionalCredits ?? 0,
    };
    return { teamCredits, userCredits };
  } else {
    // if no teamId and not org member
    if (!userCredits) {
      // check if non-org user is part of a team
      const isTeamPlan = await prisma.membership.findFirst({
        where: {
          userId: ctx.user.id,
          accepted: true,
        },
      });

      // if user is part of team we don't need user credits,
      userCredits = !isTeamPlan ? { additionalCredits: 0 } : undefined;
    }
    return { userCredits };
  }
};
