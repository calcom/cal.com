import type { PrismaTransaction } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { CreditType } from "@calcom/prisma/enums";

export class CreditsRepository {
  static async findCreditBalance(
    where: { teamId?: number | null; userId?: number | null },
    tx: PrismaTransaction = prisma
  ) {
    if (where.teamId) {
      return tx.creditBalance.findUnique({
        where: { teamId: where.teamId },
        select: {
          id: true,
          additionalCredits: true,
          limitReachedAt: true,
          warningSentAt: true,
          autoRechargeEnabled: true,
          autoRechargeThreshold: true,
          autoRechargeAmount: true,
          stripeCustomerId: true,
          lastAutoRechargeAt: true,
        },
      });
    } else if (where.userId) {
      return tx.creditBalance.findUnique({
        where: { userId: where.userId },
        select: {
          id: true,
          additionalCredits: true,
          limitReachedAt: true,
          warningSentAt: true,
          autoRechargeEnabled: true,
          autoRechargeThreshold: true,
          autoRechargeAmount: true,
          stripeCustomerId: true,
          lastAutoRechargeAt: true,
        },
      });
    }
    return null;
  }

  static async findCreditBalanceWithAutoRechargeSettings(
    where: { teamId?: number | null; userId?: number | null },
    tx: PrismaTransaction = prisma
  ) {
    if (where.teamId) {
      return tx.creditBalance.findUnique({
        where: { teamId: where.teamId },
        select: {
          id: true,
          autoRechargeEnabled: true,
          autoRechargeThreshold: true,
          autoRechargeAmount: true,
          stripeCustomerId: true,
        },
      });
    } else if (where.userId) {
      return tx.creditBalance.findUnique({
        where: { userId: where.userId },
        select: {
          id: true,
          autoRechargeEnabled: true,
          autoRechargeThreshold: true,
          autoRechargeAmount: true,
          stripeCustomerId: true,
        },
      });
    }
    return null;
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
      startDate,
      endDate,
      creditType,
    }: {
      teamId?: number | null;
      userId?: number | null;
      startDate?: Date;
      endDate?: Date;
      creditType?: typeof CreditType.MONTHLY | typeof CreditType.ADDITIONAL;
    },
    tx: PrismaTransaction = prisma
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
    let where: Prisma.CreditBalanceWhereUniqueInput;

    if (id) {
      where = { id };
    } else if (teamId) {
      where = { teamId };
    } else if (userId) {
      where = { userId };
    } else {
      throw new Error("Either id, teamId or userId must be provided");
    }

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

  static async createCreditExpenseLog(
    {
      creditBalanceId,
      credits,
      creditType,
      creditFor,
      date,
      bookingUid,
      smsSid,
      smsSegments,
      phoneNumber,
      email,
      callDuration,
      externalRef,
    }: {
      creditBalanceId: string;
      credits: number | null;
      creditType: typeof CreditType.MONTHLY | typeof CreditType.ADDITIONAL;
      creditFor?: never;
      date: Date;
      bookingUid?: string;
      smsSid?: string;
      smsSegments?: number;
      phoneNumber?: string;
      email?: string;
      callDuration?: number;
      externalRef?: string;
    },
    tx: PrismaTransaction = prisma
  ) {
    return tx.creditExpenseLog.create({
      data: {
        credits,
        creditType,
        creditFor,
        date,
        bookingUid,
        smsSid,
        smsSegments,
        phoneNumber,
        email,
        callDuration,
        externalRef,
        creditBalance: {
          connect: {
            id: creditBalanceId,
          },
        },
      },
    });
  }
}
