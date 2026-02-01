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
import { LawPayClient, type LawPayCredentials } from "./client";

const lawpayCredentialKeysSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  client_id: z.string(),
  client_secret: z.string(),
  public_key: z.string(),
  expires_at: z.number().optional(),
});

export class LawPayPaymentService implements IAbstractPaymentService {
  private credentials: LawPayCredentials | null;
  private client: LawPayClient | null;
  private paymentOption: z.infer<typeof paymentOptionEnum>;

  constructor(credentials: { key: Prisma.JsonValue }, paymentOption?: string) {
    const keyParsing = lawpayCredentialKeysSchema.safeParse(credentials.key);
    if (keyParsing.success) {
      this.credentials = keyParsing.data;
      this.client = new LawPayClient(keyParsing.data);
    } else {
      this.credentials = null;
      this.client = null;
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
    paymentOption: string,
    accountType: "operating" | "trust" = "operating"
  ): Promise<Payment> {
    try {
      if (!this.client) {
        throw new Error("LawPay credentials not found");
      }

      // Create payment with LawPay API
      const lawpayPayment = await this.client.createPayment({
        amount: payment.amount / 100, // Convert from cents to dollars
        currency: payment.currency,
        accountType,
        description: `Booking #${bookingId} - ${bookerName || bookerEmail}`,
        metadata: {
          bookingId: bookingId.toString(),
          bookerEmail,
          bookerName: bookerName || "",
        },
      });

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
            accountType,
            lawpayPaymentId: lawpayPayment.id,
          } as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: lawpayPayment.status === "succeeded",
          externalId: lawpayPayment.id,
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
      if (!this.client) {
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

      if (!payment.externalId) {
        throw new Error("Payment external ID not found");
      }

      // Refund via LawPay API
      await this.client.refundPayment(payment.externalId);

      // Update payment record
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
    paymentOption: string,
    accountType: "operating" | "trust" = "operating"
  ): Promise<Payment> {
    try {
      // This method is called to collect card details
      const paymentData = await this.create(
        payment,
        bookingId,
        null,
        null,
        null,
        bookerEmail,
        paymentOption,
        accountType
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

      if (!this.client) {
        throw new Error("LawPay credentials not found");
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          bookingId,
        },
      });

      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      if (!existingPayment.externalId) {
        throw new Error("Payment external ID not found");
      }

      // Capture the payment via LawPay API
      const capturedPayment = await this.client.capturePayment(existingPayment.externalId);

      // Update payment record
      const chargedPayment = await prisma.payment.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          success: capturedPayment.status === "succeeded",
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
