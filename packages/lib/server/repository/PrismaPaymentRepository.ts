import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type { IPaymentRepository, PaymentWithBookingCredentials } from "./PaymentRepository.interface";

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findByExternalIdIncludeBookingUserCredentials(
    externalId: string,
    credentialType: string
  ): Promise<PaymentWithBookingCredentials | null> {
    return await this.prismaClient.payment.findFirst({
      where: {
        externalId,
      },
      select: {
        id: true,
        amount: true,
        success: true,
        bookingId: true,
        booking: {
          select: {
            user: {
              select: {
                credentials: {
                  where: { type: credentialType },
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });
  }
}
