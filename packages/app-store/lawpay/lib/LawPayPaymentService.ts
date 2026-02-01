import type { Payment, PaymentApp, Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmail, sendOrganizerPaymentRefundFailedEmail } from "@calcom/emails";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

import { paymentOptionEnum } from "../zod";

const lawpayCredentialKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  public_key: z.string(),
});

export class LawPayPaymentService implements IAbstractPaymentService {
  private credentials: z.infer<typeof lawpayCredentialKeysSchema> | null;
  private paymentOption: z.infer<typeof paymentOptionEnum>;

  constructor(credentials: { key: Prisma.JsonValue }, paymentOption?: string) {
    const keyParsing = lawpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
    } else {
      this.credentials = null;
    }
    this.paymentOption = paymentOptionEnum.parse(paymentOption || "ON_BOOKING");
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    userId: number | null,
    username: string | null,
    bookerName: string | null,
    bookerEmail: string,
    paymentOption: string
  ): Promise<Payment> {
    try {
      if (!this.credentials) {
        throw new Error("LawPay credentials not found");
      }

      // Create payment record in database
      const paymentData = await prisma.payment.create({
        data: {
          uid: uuidv4(),
          app: {
            slug: "lawpay",
            categories: ["payment"],
            dirName: "lawpay",
          } as PaymentApp,
          bookingId,
          amount: payment.amount,
          currency: payment.currency,
          data: {
            paymentOption,
            bookerEmail,
            bookerName,
          } as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          externalId: "",
        },
      });

      return paymentData;
    } catch (error) {
      throw new Error(`LawPay payment creation failed: ${getErrorFromUnknown(error).message}`);
    }
  }

  async update(
    paymentId: number,
    data: Partial<Prisma.PaymentUncheckedCreateInput>
  ): Promise<Payment> {
    try {
      const payment = await prisma.payment.update({
        where: {
          id: paymentId,
        },
        data,
      });

      return payment;
    } catch (error) {
      throw new Error(`LawPay payment update failed: ${getErrorFromUnknown(error).message}`);
    }
  }

  async refund(paymentId: number): Promise<Payment> {
    try {
      if (!this.credentials) {
        throw new Error("LawPay credentials not found");
      }

      const payment = await prisma.payment.findFirst({
        where: {
          id: paymentId,
        },
        include: {
          booking: {
            include: {
              user: true,
              eventType: true,
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      // TODO: Implement actual LawPay refund API call
      // For now, mark as refunded in database
      const refundedPayment = await prisma.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          refunded: true,
        },
      });

      return refundedPayment;
    } catch (error) {
      const errorMessage = getErrorFromUnknown(error).message;
      
      // Send refund failed email to organizer
      const payment = await prisma.payment.findFirst({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              user: true,
              eventType: true,
            },
          },
        },
      });

      if (payment?.booking) {
        await sendOrganizerPaymentRefundFailedEmail({
          ...payment.booking,
          name: payment.booking.user?.name || "",
          email: payment.booking.user?.email || "",
          paymentInfo: {
            reason: errorMessage,
            id: payment.externalId,
          },
        });
      }

      throw new Error(`LawPay refund failed: ${errorMessage}`);
    }
  }

  async collectCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: number,
    bookerEmail: string,
    paymentOption: string
  ): Promise<Payment> {
    try {
      // This method is called to collect card details
      // For LawPay, we'll create a payment intent
      const paymentData = await this.create(
        payment,
        bookingId,
        null,
        null,
        null,
        bookerEmail,
        paymentOption
      );

      return paymentData;
    } catch (error) {
      throw new Error(`LawPay card collection failed: ${getErrorFromUnknown(error).message}`);
    }
  }

  async chargeCard(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId?: number
  ): Promise<Payment> {
    try {
      if (!bookingId) {
        throw new Error("Booking ID is required");
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          bookingId,
        },
      });

      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      // TODO: Implement actual LawPay charge API call
      // For now, mark as successful
      const chargedPayment = await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          success: true,
          externalId: `lawpay_${uuidv4()}`,
        },
      });

      return chargedPayment;
    } catch (error) {
      throw new Error(`LawPay card charge failed: ${getErrorFromUnknown(error).message}`);
    }
  }

  getPaymentPaidStatus(): Promise<string> {
    return Promise.resolve("paid");
  }

  getPaymentDetails(): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    // LawPay doesn't use Stripe, so we return a mock response
    return Promise.resolve({} as Stripe.Response<Stripe.PaymentIntent>);
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: Date;
      uid: string;
    },
    paymentData: Payment
  ): Promise<void> {
    // Send confirmation email or perform post-payment actions
    if (booking.user?.email && paymentData.success) {
      // Payment successful, booking confirmed
      // Additional logic can be added here
    } else if (booking.user?.email) {
      // Send awaiting payment email
      await sendAwaitingPaymentEmail({
        ...event,
        paymentInfo: {
          link: `/payment/${paymentData.uid}`,
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      });
    }
  }

  deletePayment(paymentId: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        await prisma.payment.delete({
          where: {
            id: paymentId,
          },
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  }

  isSetupAlready(): boolean {
    return !!this.credentials;
  }
}
