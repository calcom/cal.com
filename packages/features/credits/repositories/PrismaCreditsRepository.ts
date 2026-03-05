import dayjs from "@calcom/dayjs";
import type { PrismaTransaction } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import type { CreditType } from "@calcom/prisma/enums";

export class PrismaCreditsRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findCreditBalance({ teamId, userId }: { teamId?: number; userId?: number }, tx?: PrismaTransaction) {
    const client = tx ?? this.prismaClient;

    const select = {
      id: true,
      additionalCredits: true,
      limitReachedAt: true,
      warningSentAt: true,
    };

    if (teamId) {
      return await client.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await client.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
  }

  async findCreditExpenseLogByExternalRef(externalRef: string, tx?: PrismaTransaction) {
    const client = tx ?? this.prismaClient;
    return await client.creditExpenseLog.findUnique({
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

  async findCreditBalanceWithTeamOrUser(
    {
      teamId,
      userId,
    }: {
      teamId?: number | null;
      userId?: number | null;
    },
    tx?: PrismaTransaction
  ) {
    const client = tx ?? this.prismaClient;

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
      return await client.creditBalance.findUnique({
        where: {
          teamId,
        },
        select,
      });
    }

    if (userId) {
      return await client.creditBalance.findUnique({
        where: { userId },
        select,
      });
    }
  }

  async findCreditBalanceWithExpenseLogs(
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

    const client = tx ?? this.prismaClient;

    return await client.creditBalance.findUnique({
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

  async updateCreditBalance(
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
    const client = tx ?? this.prismaClient;
    if (id) {
      return client.creditBalance.update({
        where: { id },
        data,
      });
    }

    if (teamId) {
      return client.creditBalance.update({
        where: { teamId },
        data,
      });
    }

    if (userId) {
      return client.creditBalance.update({
        where: { userId },
        data,
      });
    }

    return null;
  }

  async upsertTeamBalance(
    { teamId, additionalCredits }: { teamId: number; additionalCredits: number },
    tx?: PrismaTransaction
  ) {
    return (tx ?? this.prismaClient).creditBalance.upsert({
      where: { teamId },
      create: { teamId, additionalCredits },
      update: {
        additionalCredits: { increment: additionalCredits },
        limitReachedAt: null,
        warningSentAt: null,
      },
    });
  }

  async upsertUserBalance(
    { userId, additionalCredits }: { userId: number; additionalCredits: number },
    tx?: PrismaTransaction
  ) {
    return (tx ?? this.prismaClient).creditBalance.upsert({
      where: { userId },
      create: { userId, additionalCredits },
      update: {
        additionalCredits: { increment: additionalCredits },
        limitReachedAt: null,
        warningSentAt: null,
      },
    });
  }

  async createCreditBalance(data: Prisma.CreditBalanceUncheckedCreateInput, tx?: PrismaTransaction) {
    const { teamId, userId } = data;

    if (!teamId && !userId) {
      throw new Error("Team or user ID is required");
    }

    return (tx ?? this.prismaClient).creditBalance.create({
      data: {
        ...data,
        ...(!teamId ? { userId } : {}),
      },
    });
  }

  async createCreditExpenseLog(data: Prisma.CreditExpenseLogUncheckedCreateInput, tx?: PrismaTransaction) {
    const client = tx ?? this.prismaClient;
    try {
      return await client.creditExpenseLog.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error(`Duplicate external reference - already processed: ${data?.externalRef}`);
      }
      throw error;
    }
  }

  async createCreditPurchaseLog(data: { credits: number; creditBalanceId: string }) {
    const { credits, creditBalanceId } = data;

    return this.prismaClient.creditPurchaseLog.create({
      data: {
        credits,
        creditBalanceId,
      },
    });
  }
}
