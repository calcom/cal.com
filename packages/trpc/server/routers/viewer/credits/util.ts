import dayjs from "@calcom/dayjs";
import { getMonthlyCredits } from "@calcom/features/ee/billing/lib/credits";
import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

export async function getAllCreditsForTeam(teamId: number) {
  const creditBalance = await prisma.creditBalance.findUnique({
    where: {
      teamId,
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

  const totalMonthlyCredits = await getMonthlyCredits(teamId);
  const totalMonthlyCreditsUsed =
    creditBalance?.expenseLogs.reduce((sum, log) => sum + (log?.credits ?? 0), 0) || 0;

  return {
    totalMonthlyCredits,
    totalRemainingMonthlyCredits: totalMonthlyCredits - totalMonthlyCreditsUsed,
    additionalCredits: creditBalance?.additionalCredits ?? 0,
  };
}

export const getAllCreditsForUser = async (userId: number) => {
  const creditBalance = await prisma.creditBalance.findUnique({
    where: {
      userId,
    },
    select: {
      additionalCredits: true,
    },
  });

  return {
    additionalCredits: creditBalance?.additionalCredits ?? 0,
  };
};
