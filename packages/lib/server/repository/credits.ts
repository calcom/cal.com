import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { CreditType } from "@calcom/prisma/enums";

export class CreditsRepository {
  static async findCreditBalance({ teamId, userId }: { teamId?: number; userId?: number }) {
    const select = {
      id: true,
      additionalCredits: true,
      limitReachedAt: true,
      warningSentAt: true,
    };

    if (teamId) {
      return await prisma.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await prisma.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
  }

  static async findCreditBalanceWithTeamOrUser({
    teamId,
    userId,
  }: {
    teamId?: number | null;
    userId?: number | null;
  }) {
    const select = {
      id: true,
      additionalCredits: true,
      limitReachedAt: true,
      warningSentAt: true,
      team: {
        select: {
          id: true,
          name: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  locale: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          locale: true,
        },
      },
    };
    if (teamId) {
      return await prisma.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await prisma.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
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
    userId,
    data,
  }: {
    id?: string;
    teamId?: number | null;
    userId?: number | null;
    data: Prisma.CreditBalanceUncheckedUpdateInput;
  }) {
    if (id) {
      return prisma.creditBalance.update({
        where: { id },
        data,
      });
    }

    if (teamId) {
      return prisma.creditBalance.update({
        where: { teamId },
        data,
      });
    }

    if (userId) {
      return prisma.creditBalance.update({
        where: { userId },
        data,
      });
    }

    return null;
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
