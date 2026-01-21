import prisma from "@calcom/prisma";

import type {
  TransactionInterface,
  TransactionContext,
  TransactionalPhoneNumberRepository,
} from "../interfaces/TransactionInterface";

/**
 * Prisma implementation of the transaction interface
 * This adapter handles Prisma-specific transaction logic while keeping the provider decoupled
 */
export class PrismaTransactionAdapter implements TransactionInterface {
  async executeInTransaction<T>(operations: (context: TransactionContext) => Promise<T>): Promise<T> {
    return await prisma.$transaction(async (tx) => {
      const transactionalPhoneNumberRepo: TransactionalPhoneNumberRepository = {
        async createPhoneNumber(params) {
          await tx.calAiPhoneNumber.create({
            data: {
              phoneNumber: params.phoneNumber,
              userId: params.userId,
              provider: params.provider,
              teamId: params.teamId,
              outboundAgentId: params.outboundAgentId,
              providerPhoneNumberId: params.providerPhoneNumberId,
              subscriptionStatus: params.subscriptionStatus,
              stripeCustomerId: params.stripeCustomerId,
              stripeSubscriptionId: params.stripeSubscriptionId,
            },
          });
        },
      };

      const context: TransactionContext = {
        phoneNumberRepository: transactionalPhoneNumberRepo,
      };

      return await operations(context);
    });
  }
}
