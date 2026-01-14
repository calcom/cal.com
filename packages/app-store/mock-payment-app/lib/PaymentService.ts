import type { Booking, BookingSeat, Payment, Prisma, PaymentOption } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

export class PaymentService implements IAbstractPaymentService {
  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string | null,
    paymentOption: PaymentOption,
    bookerEmail: string,
    bookingUid: string,
    bookingSeat?: BookingSeat["id"]
  ) {
    try {
      const booking = await prisma.booking.findUnique({
        select: {
          uid: true,
          title: true,
        },
        where: {
          id: bookingId,
        },
      });

      if (booking === null) {
        throw new Error("Booking not found");
      }

      const uid = uuidv4();

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "mock-payment-app",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },

          bookingSeat: bookingSeat
            ? {
                connect: {
                  id: bookingSeat,
                },
              }
            : undefined,
          amount: payment.amount,
          externalId: uid,
          currency: payment.currency,
          data: {} as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
        },
      });

      return paymentData;
    } catch (error) {
      console.error(error);
      throw new Error("Payment could not be created");
    }
  }
  async update(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  async refund(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    _bookerEmail: string,
    paymentOption: PaymentOption
  ): Promise<Payment> {
    try {
      const booking = await prisma.booking.findUnique({
        select: {
          uid: true,
          title: true,
        },
        where: {
          id: bookingId,
        },
      });
      if (booking === null) {
        throw new Error("Booking not found");
      }

      const uid = uuidv4();

      const paymentData = await prisma.payment.create({
        data: {
          uid,
          app: {
            connect: {
              slug: "paypal",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          data: {} as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption,
          externalId: "",
        },
      });

      if (!paymentData) {
        throw new Error();
      }
      return paymentData;
    } catch (error) {
      console.error(error);
      throw new Error("Payment could not be created");
    }
  }
  chargeCard(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  getPaymentPaidStatus(): Promise<string> {
    throw new Error("Method not implemented.");
  }
  getPaymentDetails(): Promise<Payment> {
    throw new Error("Method not implemented.");
  }
  afterPayment(): Promise<void> {
    return Promise.resolve();
  }
  deletePayment(): Promise<boolean> {
    return Promise.resolve(false);
  }

  isSetupAlready(): boolean {
    return true;
  }
}
