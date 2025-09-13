import dayjs from "@calcom/dayjs";
import prisma, { type PrismaTransaction } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { CreditType } from "@calcom/prisma/enums";

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
      data: Prisma.CreditBalanceUncheckedUpdateInput;
    },
    tx?: PrismaTransaction
  ) {
    const prismaClient = tx ?? prisma;
    if (id) {
      return prismaClient.creditBalance.update({
        where: { id },
        data,
      });
    }

    if (teamId) {
      return prismaClient.creditBalance.update({
        where: { teamId },
        data,
      });
    }

    if (userId) {
      return prismaClient.creditBalance.update({
        where: { userId },
        data,
      });
    }

    return null;
  }

  static async createCreditBalance(data: Prisma.CreditBalanceUncheckedCreateInput, tx?: PrismaTransaction) {
    const { teamId, userId } = data;

    if (!teamId && !userId) {
      throw new Error("Team or user ID is required");
    }

    return (tx ?? prisma).creditBalance.create({
      data: {
        ...data,
        ...(!teamId ? { userId } : {}),
      },
    });
  }

  static async createCreditExpenseLog(
    data: Prisma.CreditExpenseLogUncheckedCreateInput,
    tx?: PrismaTransaction
  ) {
    const prismaClient = tx ?? prisma;
    try {
      return await prismaClient.creditExpenseLog.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error(`Duplicate external reference - already processed: ${data?.externalRef}`);
      }
      throw error;
    }
  }

  static async createCreditPurchaseLog(data: { credits: number; creditBalanceId: string }) {
    const { credits, creditBalanceId } = data;

    return prisma.creditPurchaseLog.create({
      data: {
        credits,
        creditBalanceId,
      },
    });
  }
}
