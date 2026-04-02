import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type {
  BookingPaymentWithCredentials,
  CreatePaymentData,
  IBookingPaymentRepository,
  PaymentForAwaitingEmail,
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

  async findByIdForAwaitingPaymentEmail(id: number): Promise<PaymentForAwaitingEmail | null> {
    return await this.prismaClient.payment.findUnique({
      where: { id },
      select: {
        success: true,
        externalId: true,
        uid: true,
        paymentOption: true,
        amount: true,
        currency: true,
        app: {
          select: {
            slug: true,
          },
        },
      },
    });
  }
}
