import type { PrismaTransaction } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma/client";

export class PrismaCreditPurchaseLogRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByStripeSessionId(stripeSessionId: string) {
    return this.prismaClient.creditPurchaseLog.findUnique({
      where: { stripeSessionId },
      select: { id: true },
    });
  }

  async create(
    data: { credits: number; creditBalanceId: string; stripeSessionId: string },
    tx?: PrismaTransaction
  ) {
    return (tx ?? this.prismaClient).creditPurchaseLog.create({
      data,
    });
  }
}
