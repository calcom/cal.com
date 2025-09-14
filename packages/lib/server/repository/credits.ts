import dayjs from "@calcom/dayjs";
import type { PrismaTransaction } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class CreditsRepository {
  static async findCreditBalance(
    { teamId, userId }: { teamId?: number; userId?: number },
    tx?: PrismaTransaction
  ) {
    const prismaClient = tx ?? prisma;

    const select = {
      id: true,
      additionalCredits: true,
      limitReachedAt: true,
      warningSentAt: true,
    };

    if (teamId) {
      return await prismaClient.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await prismaClient.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
  }

  static async findCreditExpenseLogByExternalRef(externalRef: string, tx?: PrismaTransaction) {
    const prismaClient = tx ?? prisma;
    return await prismaClient.creditExpenseLog.findUnique({
      where: { externalRef },
      select: {
        id: true,
        credits: true,
        creditType: true,
        date: true,
        bookingUid: true,
      },
    });
  }

  static async findCreditBalanceWithTeamOrUser(
    {
      teamId,
      userId,
    }: {
      teamId?: number | null;
      userId?: number | null;
    },
    tx?: PrismaTransaction
  ) {
    const prismaClient = tx ?? prisma;

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
      return await prismaClient.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await prismaClient.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
  }

  static async findCreditBalanceWithExpenseLogs(
    {
      teamId,
      userId,
      startDate = dayjs().startOf("month").toDate(),
      endDate = new Date(),
      creditType,
    }: { teamId?: number; userId?: number; startDate?: Date; endDate?: Date; creditType?: CreditType },
    tx?: PrismaTransaction
  ) {
    if (!teamId && !userId) return null;

    const prismaClient = tx ?? prisma;

    return await prismaClient.creditBalance.findUnique({
      where: {
        teamId,
        ...(!teamId ? { userId } : {}),
      },
      select: {
        additionalCredits: true,
        expenseLogs: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            ...(creditType ? { creditType } : {}),
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
            credits: true,
            creditType: true,
            bookingUid: true,
            smsSid: true,
            smsSegments: true,
            phoneNumber: true,
            email: true,
            callDuration: true,
            externalRef: true,
          },
        },
      },
    });
  }

  static async updateCreditBalance(
    {
      id,
      teamId,
      userId,
      data,
    }: {
      id?: string;
      teamId?: number | null;
      userId?: number | null;
      data: Prisma.CreditBalanceUpdateInput;
    },
    tx: PrismaTransaction = prisma
  ) {
    const where: Prisma.CreditBalanceWhereUniqueInput = id
      ? { id }
      : {
          teamId_userId: {
            teamId: teamId ?? null,
            userId: userId ?? null,
          },
        };

    return tx.creditBalance.update({
      where,
      data,
    });
  }

  static async createCreditBalance(
    {
      teamId,
      userId,
      additionalCredits = 0,
      autoRechargeEnabled = false,
      autoRechargeThreshold = null,
      autoRechargeAmount = null,
      stripeCustomerId = null,
    }: {
      teamId?: number;
      userId?: number;
      additionalCredits?: number;
      autoRechargeEnabled?: boolean;
      autoRechargeThreshold?: number | null;
      autoRechargeAmount?: number | null;
      stripeCustomerId?: string | null;
    },
    tx: PrismaTransaction = prisma
  ) {
    return tx.creditBalance.create({
      data: {
        additionalCredits,
        autoRechargeEnabled,
        autoRechargeThreshold,
        autoRechargeAmount,
        stripeCustomerId,
        team: teamId
          ? {
              connect: {
                id: teamId,
              },
            }
          : undefined,
        user: userId
          ? {
              connect: {
                id: userId,
              },
            }
          : undefined,
      },
    });
  }

  static async createCreditPurchaseLog(
    {
      credits,
      creditBalanceId,
      autoRecharged = false,
    }: {
      credits: number;
      creditBalanceId: string;
      autoRecharged?: boolean;
    },
    tx: PrismaTransaction = prisma
  ) {
    return tx.creditPurchaseLog.create({
      data: {
        credits,
        creditBalanceId,
        autoRecharged,
        date: new Date(),
      },
    });
  }
}
