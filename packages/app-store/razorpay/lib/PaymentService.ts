import type { Booking, Payment, PaymentOption, Prisma } from "@prisma/client";
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { sendAwaitingPaymentEmailAndSMS } from "@calcom/emails";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { IAbstractPaymentService } from "@calcom/types/PaymentService";

const log = logger.getSubLogger({ prefix: ["payment-service:razorpay"] });

export const razorpayCredentialKeysSchema = z.object({
  key_id: z.string(),
  key_secret: z.string(),
});

export class PaymentService implements IAbstractPaymentService {
  private credentials: { key_id: string; key_secret: string };
  private razorpay: Razorpay;

  constructor(credentials: { key: { key_id: string; key_secret: string } }) {
    this.credentials = credentials.key;
    this.razorpay = new Razorpay({
      key_id: this.credentials.key_id,
      key_secret: this.credentials.key_secret,
    });
  }

  async create(
    payment: Pick<Prisma.PaymentUncheckedCreateInput, "amount" | "currency">,
    bookingId: Booking["id"],
    userId: Booking["userId"],
    username: string | null,
    bookerName: string,
    paymentOption: PaymentOption,
    bookerEmail: string
  ) {
    try {
      if (!this.credentials) {
        throw new Error("Razorpay credentials not found");
      }

      // Create Razorpay order
      const order = await this.razorpay.orders.create({
        amount: payment.amount * 100, // Razorpay expects amount in smallest currency unit
        currency: payment.currency,
        notes: {
          bookingId: bookingId.toString(),
          userId: userId?.toString(),
          username,
          bookerName,
          bookerEmail,
        },
      });

      const paymentData = await prisma.payment.create({
        data: {
          uid: uuidv4(),
          app: {
            connect: {
              slug: "razorpay",
            },
          },
          booking: {
            connect: {
              id: bookingId,
            },
          },
          amount: payment.amount,
          currency: payment.currency,
          externalId: order.id,
          data: order as unknown as Prisma.InputJsonValue,
          fee: 0,
          refunded: false,
          success: false,
          paymentOption: paymentOption || "ON_BOOKING",
        },
      });

      return paymentData;
    } catch (error) {
      log.error("Razorpay: Payment could not be created for bookingId", bookingId, safeStringify(error));
      throw new Error("Razorpay: Payment could not be created");
    }
  }

  async afterPayment(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment,
    _eventTypeMetadata: Record<string, unknown>
  ): Promise<void> {
    await sendAwaitingPaymentEmailAndSMS({
      ...event,
      paymentInfo: {
        link: `/payment/${paymentData.uid}`,
        paymentOption: paymentData.paymentOption || "ON_BOOKING",
        amount: paymentData.amount,
        currency: paymentData.currency,
      },
    });
  }

  async sendPaymentSuccessEmail(
    event: CalendarEvent,
    booking: {
      user: { email: string | null; name: string | null; timeZone: string } | null;
      id: number;
      startTime: { toISOString: () => string };
      uid: string;
    },
    paymentData: Payment,
    _eventTypeMetadata: Record<string, unknown>
  ): Promise<void> {
    await sendAwaitingPaymentEmailAndSMS({
      ...event,
      paymentInfo: {
        link: `/payment/${paymentData.uid}`,
        paymentOption: paymentData.paymentOption || "ON_BOOKING",
        amount: paymentData.amount,
        currency: paymentData.currency,
      },
    });
  }

  // Implement other required methods...
}
