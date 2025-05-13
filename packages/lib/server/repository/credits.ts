import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { CreditType } from "@calcom/prisma/enums";

export class CreditsRepository {
  static async findCreditBalance({ teamId }: { teamId: number }) {
    return await prisma.creditBalance.findUnique({
      where: {
        teamId,
      },
      select: {
        id: true,
        additionalCredits: true,
        limitReachedAt: true,
        warningSentAt: true,
      },
    });
  }

  static async findCreditBalanceWithExpenseLogs({ teamId }: { teamId: number }) {
    return await prisma.creditBalance.findUnique({
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
  }

  static async updateCreditBalance({
    id,
    teamId,
    data,
  }: {
    id?: string;
    teamId?: number;
    data: Prisma.CreditBalanceUncheckedUpdateInput;
  }) {
    if (!id && !teamId) return null;

    return prisma.creditBalance.update({
      where: id ? { id } : { teamId },
      data,
    });
  }

  static async createCreditBalance(data: Prisma.CreditBalanceUncheckedCreateInput) {
    return prisma.creditBalance.create({
      data,
    });
  }

  static async createCreditExpenseLog(data: Prisma.CreditExpenseLogUncheckedCreateInput) {
    return prisma.creditExpenseLog.create({
      data,
    });
  }
}
