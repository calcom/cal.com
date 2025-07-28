import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type {
  IBookingPaymentRepository,
  BookingPaymentWithCredentials,
  CreatePaymentData,
} from "./BookingPaymentRepository.interface";

export class PrismaBookingPaymentRepository implements IBookingPaymentRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async findByExternalIdIncludeBookingUserCredentials(
    externalId: string,
    credentialType: string
  ): Promise<BookingPaymentWithCredentials | null> {
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

  async createPaymentRecord(data: CreatePaymentData) {
    const createdPayment = await this.prismaClient.payment.create({
      data,
    });
    return createdPayment;
  }
}
